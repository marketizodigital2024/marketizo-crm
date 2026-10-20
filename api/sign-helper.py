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
from xml.sax.saxutils import escape

import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, Flowable
from pypdf import PdfReader, PdfWriter

VERSION = "marketizo-pdf-1"
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
    canvas.setFont("Sign", 7)
    canvas.setFillColor(colors.HexColor("#647184"))
    canvas.drawString(48, 32, "Marketizo Sign | " + doc.title[:60])
    canvas.drawRightString(A4[0] - 48, 32, str(doc.page))
    canvas.restoreState()


def build_pdf(title, story):
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4, rightMargin=48, leftMargin=48, topMargin=48, bottomMargin=52, title=title, author="Marketizo Sign", invariant=1)
    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    data = output.getvalue()
    if len(data) > 1000000:
        raise ValueError("PDF exceeds supported size")
    return data


def render_original(payload):
    doc = payload["document"]
    s = styles()
    story = [Paragraph(plain(doc["title"], 180), s["title"])]
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
    data = build_pdf(doc["title"], story)
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
        if signer.get("strokes"):
            section.append(Drawing(signer["strokes"]))
        story.append(KeepTogether(section))
    story += [Spacer(1, 12), Paragraph("Dokazni manifest: " + plain(payload["manifestSha256"], 64), s["small"]),
              Paragraph("Serverska evidencija čuva verziju dokumenta, OTP potvrdu, nameru potpisnika i vreme događaja. Pristup e-mail adresi sam po sebi nije potvrda građanskog identiteta ili ovlašćenja zastupnika.", s["small"])]
    certificate = build_pdf("Evidencija prihvatanja", story)
    # Incremental append retains all original PDF bytes unchanged at the start.
    writer = PdfWriter(io.BytesIO(original), incremental=True)
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
