"""Private HMAC-authenticated PDF/SMTP helper; no public signing authority."""
import base64
import hashlib
import hmac
import io
import json
import os
import re
import smtplib
import ssl
import time
from email.message import EmailMessage
from email.utils import formatdate
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
from xml.sax.saxutils import escape

import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, Flowable
from pypdf import PdfReader, PdfWriter

VERSION = "marketizo-pdf-3"
LOGO = ImageReader(str(Path(__file__).resolve().parents[1] / "marketizo-logo.png"))
FONTS = Path(reportlab.__file__).parent / "fonts"
for name, file in [("Sign", "Vera.ttf"), ("SignBold", "VeraBd.ttf"), ("SignItalic", "VeraIt.ttf"), ("SignBI", "VeraBI.ttf")]:
    pdfmetrics.registerFont(TTFont(name, str(FONTS / file)))
pdfmetrics.registerFontFamily("Sign", normal="Sign", bold="SignBold", italic="SignItalic", boldItalic="SignBI")


def plain(value, limit=100000):
    if not isinstance(value, str) or len(value) > limit:
        raise ValueError("Invalid text")
    for c in value:
        if c not in "\n\r\t" and ord(c) not in pdfmetrics.getFont("Sign").face.charToGlyph:
            raise ValueError("PDF font does not support one or more characters; use a supported font/language before sending")
    return escape(value).replace("\n", "<br/>")


def styles():
    return {
        "body": ParagraphStyle("body", fontName="Sign", fontSize=10, leading=16, spaceAfter=9, alignment=TA_LEFT, splitLongWords=True),
        "title": ParagraphStyle("title", fontName="SignBold", fontSize=21, leading=28, spaceAfter=22, keepWithNext=True),
        "heading": ParagraphStyle("heading", fontName="SignBold", fontSize=13, leading=19, spaceBefore=12, spaceAfter=9, keepWithNext=True),
        "small": ParagraphStyle("small", fontName="Sign", fontSize=8, leading=12, spaceAfter=8, textColor=colors.HexColor("#556071")),
    }


def page_footer(canvas, doc):
    canvas.saveState()
    # Shared, print-friendly stationery for agreements and acceptance receipts.
    # Keep all branding outside the document text frame on every page.
    canvas.drawImage(LOGO, 20, A4[1] - 104, width=144, height=81, mask="auto")
    issuer = getattr(doc, "issuer", {})
    info = "<b>" + plain(issuer.get("name", "Marketizo"), 180) + "</b><br/>" + plain(issuer.get("address", ""), 300) + "<br/>" + plain(issuer.get("email", "office@marketizo.com"), 254)
    heading = Paragraph(info, ParagraphStyle("issuer", fontName="Sign", fontSize=7.5, leading=11, alignment=2))
    _, ih = heading.wrap(300, 70)
    heading.drawOn(canvas, A4[0] - 348, A4[1] - 90)
    canvas.setStrokeColor(colors.HexColor("#F68B1F"))
    canvas.setLineWidth(1)
    canvas.line(48, A4[1] - 110, A4[0] - 48, A4[1] - 110)
    canvas.line(48, 44, A4[0] - 48, 44)
    canvas.setFont("Sign", 7)
    canvas.setFillColor(colors.HexColor("#647184"))
    canvas.drawString(48, 32, "Marketizo Sign | " + doc.title[:60])
    canvas.drawRightString(A4[0] - 48, 32, str(doc.page))
    canvas.restoreState()


def build_pdf(title, story, issuer=None):
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4, rightMargin=48, leftMargin=48, topMargin=132, bottomMargin=60, title=title, author="Marketizo Sign", invariant=1)
    doc.issuer = issuer or {}
    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    data = output.getvalue()
    if len(data) > 1000000:
        raise ValueError("PDF exceeds supported size")
    return data



def display_date(value):
    if not value:
        return "________________"
    return datetime.fromisoformat(value).strftime("%d.%m.%Y.")


def signed_date(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(ZoneInfo("Europe/Vienna")).strftime("%d.%m.%Y. %H:%M")


def paper_text(canvas, value, x, y, width=230, size=8, bold=False, max_height=24):
    p = Paragraph(plain(value, 1000), ParagraphStyle("paper", fontName="SignBold" if bold else "Sign", fontSize=size, leading=size+3))
    _, height = p.wrap(width, 200)
    while height > max_height and size > 5.5:
        size -= .5
        p.style.fontSize = size; p.style.leading = size + 2
        _, height = p.wrap(width, 200)
    p.drawOn(canvas, x, y-height)


class SignatureBlock(Flowable):
    def __init__(self, details, issuer, owner, other, layouts):
        Flowable.__init__(self)
        self.width, self.height = A4[0]-96, 238
        self.details, self.issuer, self.owner, self.other, self.layouts = details, issuer, owner, other, layouts

    def wrap(self, availWidth, availHeight):
        return self.width, max(self.height, availHeight)

    def drawOn(self, canvas, x, y, _sW=0):
        self.layouts.append({"page": canvas.getPageNumber(), "x": x, "y": y, "width": self.width, "height": self.height,
            "slots": [{"email": p.get("email", ""), "name": p.get("name", ""), "role": role, "x": x+offset, "y": y+28, "width": 230, "height": 55, "dateY": y+13} for p, role, offset in [(self.owner, "marketizo", 0), (self.other, "counterparty", 267)]]})
        super().drawOn(canvas, x, y, _sW)

    def draw(self):
        c = self.canv
        audience = self.details.get("audience", "client")
        labels = {"employee": ("Poslodavac / Arbeitgeber", "Zaposleni / Arbeitnehmer"), "contractor": ("Naručilac / Auftraggeber", "Saradnik / Auftragnehmer"), "client": ("Marketizo / Auftragnehmer", "Klijent / Kunde"), "other": ("Marketizo / Marketizo", "Ugovorna strana / Vertragspartei")}
        left, right = labels.get(audience, labels["other"])
        c.setStrokeColor(colors.HexColor("#F68B1F")); c.setLineWidth(.7); c.line(0, 233, self.width, 233)
        for p, label, offset in [(self.owner, left, 0), (self.other, right, 267)]:
            paper_text(c, label, offset, 219, bold=True)
            name = (p.get("name", "") if audience == "employee" and offset else p.get("company", "")) or (self.issuer.get("name", "Marketizo") if offset == 0 else p.get("name", ""))
            paper_text(c, name, offset, 201, bold=True, max_height=20)
            paper_text(c, ("Ime i prezime / Vor- und Nachname: " if audience == "employee" and offset else "Zastupnik / Vertreten durch: ") + (p.get("name", "") or "________________"), offset, 178, size=7, max_height=24)
            paper_text(c, p.get("email", ""), offset, 153, size=7)
            paper_text(c, "Potpis / Unterschrift", offset, 100, size=8)
            c.setStrokeColor(colors.HexColor("#CBD1D9")); c.line(offset, 26, offset+230, 26)
            paper_text(c, "Datum potpisa / Unterzeichnet am:", offset, 23, size=6.5)
        paper_text(c, "Mesto / Ort: " + (self.details.get("place") or "________________"), 0, 134, size=8)
        if audience == "client":
            paper_text(c, "Početak saradnje / Beginn der Zusammenarbeit: " + display_date(self.details.get("startDate")), 267, 134, size=7)


def render_original(payload):
    doc = payload["document"]
    s = styles()
    story = [Paragraph(plain(doc["title"], 180), s["title"])]
    for recipient in doc.get("recipients", []):
        if recipient.get("role") == "marketizo" or not any(recipient.get(k) for k in ("address", "taxId", "registrationId")):
            continue
        info = [recipient.get("company") or recipient.get("name", "")]
        if recipient.get("address"): info.append("Adresa / Anschrift: " + recipient["address"])
        if recipient.get("taxId"): info.append("Poreski broj / Steuernummer: " + recipient["taxId"])
        if recipient.get("registrationId"): info.append("Registracioni broj / Registernummer: " + recipient["registrationId"])
        story.append(Paragraph("<br/>".join(plain(v, 400) for v in info), s["small"]))
    blocks = doc["content"]["blocks"]
    if len(blocks) > 500:
        raise ValueError("Too many blocks")
    count = 0
    for block in blocks:
        parts = []
        for run in block["runs"]:
            text = plain(run["text"], 10000)
            if run.get("bold"):
                text = "<b>" + text + "</b>"
            if run.get("italic"):
                text = "<i>" + text + "</i>"
            if run.get("underline"):
                text = "<u>" + text + "</u>"
            parts.append(text)
        text = "".join(parts)
        if block["type"] == "ordered":
            count += 1
            text = str(count) + ". " + text
        else:
            count = 0
            if block["type"] == "bullet":
                text = "• " + text
        story.append(Paragraph(text or "<br/>", s["heading"] if block["type"] == "heading" else s["body"]))
    # No internal notes, signature metadata or disclaimer is added to the agreement.
    # The exact original bytes are what every signer previews and accepts.
    issuer = payload.get("issuer", {})
    details = doc.get("contractDetails", {})
    if "audience" not in details:
        details = dict(details, audience="employee" if doc.get("category") == "employees" else "client" if doc.get("category") == "clients" else "other")
    parties = doc.get("recipients", [])
    owners = [p for p in parties if p.get("role") == "marketizo"]
    others = [p for p in parties if p.get("role") != "marketizo"] or [{}]
    layouts = []
    for other in others:
        story.append(SignatureBlock(details, issuer, owners[0] if owners else {}, other, layouts))
    data = build_pdf(doc["title"], story, issuer)
    writer = PdfWriter(io.BytesIO(data))
    writer.add_metadata({"/MarketizoLayout": json.dumps({"version": 1, "blocks": layouts, "issuer": issuer}, ensure_ascii=False)})
    out = io.BytesIO(); writer.write(out); data = out.getvalue()
    return {"base64": base64.b64encode(data).decode(), "sha256": hashlib.sha256(data).hexdigest(), "renderer": VERSION}


class Drawing(Flowable):
    def __init__(self, strokes):
        Flowable.__init__(self)
        self.strokes, self.width, self.height = strokes, 240, 65

    def draw(self):
        self.canv.setStrokeColor(colors.HexColor("#182637"))
        self.canv.setLineWidth(1.2)
        for stroke in self.strokes:
            if not stroke:
                continue
            p = self.canv.beginPath()
            p.moveTo(float(stroke[0][0]) * self.width, (1-float(stroke[0][1])) * self.height)
            for x, y in stroke[1:]:
                p.lineTo(float(x) * self.width, (1-float(y)) * self.height)
            self.canv.drawPath(p)


def render_final(payload):
    original = base64.b64decode(payload["originalBase64"].replace("\n", "").replace("\r", ""), validate=True)
    if not original.startswith(b"%PDF-") or hashlib.sha256(original).hexdigest() != payload["originalSha256"]:
        raise ValueError("Original PDF integrity mismatch")
    evidence = payload["evidence"]
    s = styles()
    story = [Paragraph("Evidencija elektronskog prihvatanja", s["title"]),
             Paragraph("Jednostavan elektronski potpis - ovo nije kvalifikovani elektronski potpis niti kvalifikovani vremenski žig.", s["small"]),
             Paragraph("Dokument: " + plain(evidence["title"], 180), s["body"]),
             Paragraph("SHA-256 originalnog PDF-a: " + plain(payload["originalSha256"], 64), s["small"]),
             Paragraph("Zahtev: " + plain(evidence["requestId"], 36), s["small"])]
    for signer in evidence["signers"]:
        section = [Paragraph(plain(signer["name"], 160), s["heading"]),
                   Paragraph(plain(signer["email"], 254) + "<br/>" + plain(signer["acceptedAt"], 40), s["body"]),
                   Paragraph(plain(signer["consentText"], 2000), s["small"])]
        if signer.get("authentication", {}).get("method") == "email_link":
            section.append(Paragraph("Pristup preko pozivnog e-mail linka, bez dodatne provere identiteta.", s["small"]))
        if signer.get("strokes"):
            section.append(Drawing(signer["strokes"]))
        story.append(KeepTogether(section))
    story += [Spacer(1, 12), Paragraph("Dokazni manifest: " + plain(payload["manifestSha256"], 64), s["small"]),
              Paragraph("Serverska evidencija čuva verziju dokumenta, način pristupa, nameru potpisnika i vreme događaja. Pristup preko e-mail linka sam po sebi nije potvrda građanskog identiteta ili ovlašćenja zastupnika.", s["small"])]
    certificate = build_pdf("Evidencija prihvatanja", story, evidence.get("issuer", {}))
    # Incremental append retains all original PDF bytes unchanged at the start.
    writer = PdfWriter(io.BytesIO(original), incremental=True)
    layout_raw = PdfReader(io.BytesIO(original)).metadata.get("/MarketizoLayout")
    if layout_raw:
        layout = json.loads(layout_raw)
        for block in layout["blocks"]:
            overlay = io.BytesIO()
            from reportlab.pdfgen.canvas import Canvas
            c = Canvas(overlay, pagesize=A4, invariant=1)
            for slot in block["slots"]:
                signer = next((s for s in evidence["signers"] if s.get("email", "").lower() == slot["email"].lower() and slot["email"]), None)
                if not signer:
                    continue
                if signer.get("strokes"):
                    drawing = Drawing(signer["strokes"]); drawing.width, drawing.height = slot["width"], slot["height"]
                    drawing.drawOn(c, slot["x"], slot["y"])
                else:
                    paper_text(c, signer["name"], slot["x"]+5, slot["y"]+35, width=slot["width"]-10, size=14)
                paper_text(c, signed_date(signer["acceptedAt"]), slot["x"], slot["dateY"]-4, width=230, size=7)
            c.save()
            writer.pages[block["page"]-1].merge_page(PdfReader(io.BytesIO(overlay.getvalue())).pages[0])
    if not layout_raw:
        for page in PdfReader(io.BytesIO(certificate)).pages:
            writer.add_page(page)
    output = io.BytesIO()
    writer.write(output)
    final = output.getvalue()
    if not final.startswith(original) or len(final) > 1500000:
        raise ValueError("Final PDF integrity or size check failed")
    return {"base64": base64.b64encode(final).decode(), "sha256": hashlib.sha256(final).hexdigest(), "renderer": VERSION}


def send_mail(payload):
    host, user, password = (os.environ.get(k, "") for k in ["SIGN_SMTP_HOST", "SIGN_SMTP_USER", "SIGN_SMTP_PASSWORD"])
    sender = os.environ.get("SIGN_MAIL_FROM", "office@marketizo.com")
    recipient = payload["to"]
    if not host or not user or not password:
        raise ValueError("SMTP not configured")
    if not re.fullmatch(r"[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+", recipient) or any(c in sender for c in "\r\n"):
        raise ValueError("Invalid address")
    msg = EmailMessage()
    msg["From"], msg["To"] = sender, recipient
    msg["Subject"] = payload["subject"][:180]
    msg["Date"] = formatdate(localtime=False)
    msg["Message-ID"] = "<marketizo-sign-" + re.sub(r"[^a-zA-Z0-9-]", "", payload["id"]) + "@" + sender.split("@")[-1] + ">"
    msg.set_content(payload["text"])
    if payload.get("attachment"):
        attachment = payload["attachment"]
        data = base64.b64decode(attachment["base64"].replace("\n", "").replace("\r", ""), validate=True)
        if not data.startswith(b"%PDF-") or len(data) > 1500000 or hashlib.sha256(data).hexdigest() != attachment["sha256"]:
            raise ValueError("Receipt attachment integrity mismatch")
        msg.add_attachment(data, maintype="application", subtype="pdf", filename="Marketizo-potpisani-dokument.pdf")
    port = int(os.environ.get("SIGN_SMTP_PORT", "465"))
    if port not in [465, 587]:
        raise ValueError("Only encrypted SMTP is supported")
    if port == 465:
        smtp = smtplib.SMTP_SSL(host, port, timeout=15, context=ssl.create_default_context())
    else:
        smtp = smtplib.SMTP(host, port, timeout=15)
        smtp.ehlo()
        smtp.starttls(context=ssl.create_default_context())
        smtp.ehlo()
    with smtp:
        smtp.login(user, password)
        refused = smtp.send_message(msg)
        if refused:
            raise ValueError("Recipient rejected by SMTP")
    return {"accepted": True}


def authorize(raw, timestamp, signature):
    secret = os.environ.get("SIGN_INTERNAL_SECRET", "")
    if len(secret) < 32 or abs(time.time() - int(timestamp)) > 60:
        return False
    expected = hmac.new(secret.encode(), timestamp.encode() + b"." + raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def dispatch(payload):
    if payload.get("action") == "render":
        return render_original(payload)
    if payload.get("action") == "finalize":
        return render_final(payload)
    if payload.get("action") == "mail":
        return send_mail(payload)
    raise ValueError("Unknown helper action")


class handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Never log addresses, invitation tokens, codes, content or credentials.

    def do_POST(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 3500000:
                raise ValueError("Invalid body size")
            raw = self.rfile.read(size)
            if not authorize(raw, self.headers.get("X-Sign-Time", "0"), self.headers.get("X-Sign-MAC", "")):
                self.respond(403, {"ok": False})
                return
            result = dispatch(json.loads(raw))
            self.respond(200, {"ok": True, **result})
        except Exception:
            self.respond(503, {"ok": False, "error": "PDF ili e-mail obrada trenutno nije dostupna."})

    def respond(self, status, value):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(json.dumps(value).encode())
