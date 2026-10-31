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
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, Flowable, Table, TableStyle
from pypdf import PdfReader, PdfWriter

VERSION = "marketizo-pdf-6"
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
        "body": ParagraphStyle("body", fontName="Sign", fontSize=10, leading=13.5, spaceAfter=4, alignment=TA_LEFT, splitLongWords=True),
        "title": ParagraphStyle("title", fontName="SignBold", fontSize=18, leading=23, spaceAfter=12, keepWithNext=True),
        "heading": ParagraphStyle("heading", fontName="SignBold", fontSize=11, leading=15, spaceBefore=9, spaceAfter=4, keepWithNext=True, textColor=colors.HexColor("#F68B1F")),
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
    canvas.drawString(48, 32, "Marketizo Digital e.U.")
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
        de = self.details.get("language") == "de"
        audience = self.details.get("audience", "client")
        labels = {"employee": ("Arbeitgeber" if de else "Poslodavac", "Arbeitnehmer" if de else "Zaposleni"), "contractor": ("Auftraggeber" if de else "Naručilac", "Auftragnehmer" if de else "Saradnik"), "client": ("Auftragnehmer" if de else "Marketizo", "Kunde" if de else "Klijent"), "other": ("Marketizo", "Vertragspartei" if de else "Ugovorna strana"), "codeks": ("Marketizo", "Mitglied des Teams" if de else "Član tima")}
        left, right = labels.get(audience, labels["other"])
        c.setStrokeColor(colors.HexColor("#F68B1F")); c.setLineWidth(.7); c.line(0, 233, self.width, 233)
        for p, label, offset in [(self.owner, left, 0), (self.other, right, 267)]:
            if audience == "codeks" and offset == 0:
                paper_text(c, self.issuer.get("name", "Marketizo"), 0, 201, bold=True)
                continue
            paper_text(c, label, offset, 219, bold=True)
            name = (p.get("name", "") if audience in ("employee", "codeks") and offset else p.get("company", "")) or (self.issuer.get("name", "Marketizo") if offset == 0 else p.get("name", ""))
            paper_text(c, name, offset, 201, bold=True, max_height=20)
            paper_text(c, (("Vor- und Nachname: " if de else "Ime i prezime: ") if audience in ("employee", "codeks") and offset else ("Vertreten durch: " if de else "Zastupnik: ")) + (p.get("name", "") or "________________"), offset, 178, size=7, max_height=24)
            paper_text(c, p.get("email", ""), offset, 153, size=7)
            paper_text(c, "Unterschrift" if de else "Potpis", offset, 100, size=8)
            c.setStrokeColor(colors.HexColor("#CBD1D9")); c.line(offset, 26, offset+230, 26)
            paper_text(c, "Unterzeichnet am:" if de else "Datum potpisa:", offset, 23, size=6.5)
        if audience != "codeks":
            paper_text(c, ("Ort: " if de else "Mesto: ") + (self.details.get("place") or "________________"), 0, 134, size=8)
        if audience == "client":
            paper_text(c, ("Beginn der Zusammenarbeit: " if de else "Početak saradnje: ") + display_date(self.details.get("startDate")), 267, 134, size=7)


class OnboardingSignatureBlock(Flowable):
    """One client, one signature; no unused agency or cooperation-date fields."""
    def __init__(self, recipient, layouts, compact=False):
        Flowable.__init__(self)
        self.recipient, self.layouts, self.compact = recipient, layouts, compact
        self.width, self.height = A4[0] - 96, 140 if compact else 180

    def wrap(self, availWidth, availHeight):
        return self.width, max(self.height, availHeight)

    def drawOn(self, canvas, x, y, _sW=0):
        self.layouts.append({"page": canvas.getPageNumber(), "x": x, "y": y, "width": self.width, "height": self.height,
            "slots": [{"email": self.recipient.get("email", ""), "name": self.recipient.get("name", ""), "role": "counterparty",
                       "x": x, "y": y + (20 if self.compact else 28), "width": 270, "height": 30 if self.compact else 44,
                       "dateX": x + 300, "dateY": y + 34, "dateFontSize": 10, "dateWidth": 190}]})
        super().drawOn(canvas, x, y, _sW)

    def draw(self):
        c, p = self.canv, self.recipient
        if self.compact:
            c.setStrokeColor(colors.HexColor("#F68B1F")); c.setLineWidth(.7); c.line(0, 137, self.width, 137)
            paper_text(c, "Ime i prezime", 0, 123, size=9, bold=True)
            paper_text(c, "Naziv firme", 267, 123, size=9, bold=True)
            paper_text(c, p.get("name") or "________________", 0, 107, size=10.5, max_height=25)
            paper_text(c, p.get("company") or "________________", 267, 107, size=10.5, max_height=25)
            paper_text(c, " · ".join(v for v in [p.get("email", ""), ("Zemlja: " + p["country"]) if p.get("country") else ""] if v), 0, 76, width=self.width, size=9)
            paper_text(c, "Potpis klijenta", 0, 56, size=9, bold=True)
            paper_text(c, "Datum potpisa", 300, 56, width=190, size=9, bold=True)
            c.setStrokeColor(colors.HexColor("#CBD1D9")); c.line(0, 18, 270, 18)
            return
        c.setStrokeColor(colors.HexColor("#F68B1F")); c.setLineWidth(.7); c.line(0, 177, self.width, 177)
        paper_text(c, "Ime i prezime", 0, 159, size=9, bold=True)
        paper_text(c, "Naziv firme", 267, 159, size=9, bold=True)
        paper_text(c, p.get("name") or "________________", 0, 140, size=11, max_height=30)
        paper_text(c, p.get("company") or "________________", 267, 140, size=11, max_height=30)
        paper_text(c, p.get("email", ""), 0, 101, width=self.width, size=10)
        paper_text(c, "Potpis klijenta", 0, 81, size=9, bold=True)
        paper_text(c, "Datum potpisa", 300, 61, width=190, size=9, bold=True)
        c.setStrokeColor(colors.HexColor("#CBD1D9")); c.line(0, 26, 270, 26)


def identity_paragraph(value, style):
    parts = value.split(":", 1)
    text = ("<b>" + plain(parts[0]) + ":</b> " + plain(parts[1])) if len(parts) == 2 else plain(value)
    return Paragraph(text, style)


def identity_cards(left, right, de=False):
    style = ParagraphStyle("identity-value", fontName="Sign", fontSize=10.5, leading=15.5, spaceAfter=6)
    heading = ParagraphStyle("identity-label", parent=style, fontName="SignBold", fontSize=12, leading=17, spaceAfter=12, textColor=colors.HexColor("#243043"))
    cells = [[Paragraph("Marketizo Digital", heading)] + [identity_paragraph(x, style) for x in left if x],
             [Paragraph("Kunde" if de else "Klijent", heading)] + [identity_paragraph(x, style) for x in right if x]]
    width = (A4[0] - 96 - 18) / 2
    table = Table([[cells[0], "", cells[1]]], colWidths=[width, 18, width], hAlign="LEFT")
    table.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"), ("BACKGROUND", (0,0), (0,0), colors.HexColor("#F4F6F8")), ("BACKGROUND", (2,0), (2,0), colors.HexColor("#F4F6F8")), ("BOX", (0,0), (0,0), .5, colors.HexColor("#DCE1E7")), ("BOX", (2,0), (2,0), .5, colors.HexColor("#DCE1E7")), ("LEFTPADDING", (0,0), (-1,-1), 12), ("RIGHTPADDING", (0,0), (-1,-1), 12), ("TOPPADDING", (0,0), (-1,-1), 14), ("BOTTOMPADDING", (0,0), (-1,-1), 14)]))
    return [table, Spacer(1, 24)]


def generic_client_identity(doc, issuer, styles, de):
    rec = next((r for r in doc.get("recipients", []) if r.get("role") != "marketizo"), {})
    left = [issuer.get("name", ""), ("Anschrift: " if de else "Adresa: ") + issuer.get("address", ""), issuer.get("email", "")]
    right = [rec.get("company") or rec.get("name", ""), ("Vertreten durch: " if de else "Zastupnik: ") + rec.get("name", ""), ("Anschrift: " if de else "Adresa: ") + rec.get("address", ""), ("PLZ: " if de else "Poštanski broj: ") + rec.get("postalCode", ""), ("Land: " if de else "Zemlja: ") + rec.get("country", ""), ("Steuernummer: " if de else "PIB: ") + rec.get("taxId", ""), rec.get("email", "")]
    return identity_cards(left, right, de)


def client_identity_intro(doc, issuer, styles, de):
    blocks = doc["content"]["blocks"]
    raw = ["".join(r["text"] for r in b["runs"]).strip() for b in blocks]
    first_clause = next((i for i, text in enumerate(raw) if re.match(r"^(?:Klauzula|Klausel|Član|Artikel)\s*1\b", text)), None)
    between = next((i for i, text in enumerate(raw[:first_clause]) if text in ("Između:", "Zwischen:")), None) if first_clause else None
    bank_end = next((i for i, text in enumerate(raw[:first_clause]) if text.startswith("IBAN:")), None) if first_clause else None
    subject = next((i for i, text in enumerate(raw[:first_clause]) if text in ("Predmet ugovora:", "Vertragsgegenstand:")), None) if first_clause else None
    if between is None or bank_end is None or subject is None or bank_end <= between:
        return None
    subject_lines = raw[subject:subject+2]
    left = raw[between+1:bank_end+1]
    right = [text for i, text in enumerate(raw[bank_end+1:first_clause], bank_end+1) if i not in (subject,subject+1) and text not in ("und", "i", "Kunde:")]
    rec = next((r for r in doc.get("recipients", []) if r.get("role") != "marketizo"), {})
    if rec.get("postalCode"):
        suffix = " (" + ("PLZ: " if de else "poštanski broj: ") + rec["postalCode"] + ")"
        right = [value[:-len(suffix)] if value.endswith(suffix) else value for value in right]
        right.append(("PLZ: " if de else "Poštanski broj: ") + rec["postalCode"])
    if rec.get("email"): right.append(("E-Mail: " if de else "Mejl: ") + rec["email"])
    if rec.get("country"): right.append(("Land: " if de else "Zemlja: ") + rec["country"])
    lead_style = ParagraphStyle("contract-intro-title", parent=styles["body"], fontName="SignBold", fontSize=13, leading=19, spaceAfter=8)
    flow = [Paragraph(plain(text), lead_style if i == 0 else styles["body"]) for i, text in enumerate(raw[:between]) if text]
    flow.extend([Spacer(1, 14), Paragraph(plain(raw[between]), styles["heading"])])
    flow.extend(identity_cards(left, right, de))
    flow.extend([identity_paragraph(text, styles["body"]) for text in subject_lines if text])
    flow.append(Spacer(1, 22))
    return flow, blocks[first_clause:], {"preamble": raw[:between], "left": left, "right": right, "subject": subject_lines, "language": "de" if de else "sr"}


def render_original(payload):
    doc = payload["document"]
    s = styles()
    onboarding = bool(re.fullmatch(r"marketizo-onboarding:v[1234]", doc.get("note", "")))
    two_page_onboarding = doc.get("note") == "marketizo-onboarding:v4"
    compact_onboarding = doc.get("note") in ("marketizo-onboarding:v2", "marketizo-onboarding:v3")
    if onboarding:
        s["body"] = ParagraphStyle("onboarding-body", parent=s["body"], fontSize=11.5, leading=16.5, spaceAfter=7)
        s["heading"] = ParagraphStyle("onboarding-heading", parent=s["heading"], fontSize=12.5, leading=17, spaceBefore=12, spaceAfter=5)
        s["title"] = ParagraphStyle("onboarding-title", parent=s["title"], fontSize=20, leading=26, spaceAfter=15)
        if compact_onboarding:
            s["body"] = ParagraphStyle("onboarding-one-page-body", parent=s["body"], fontSize=11, leading=14, spaceAfter=3)
            s["title"] = ParagraphStyle("onboarding-one-page-title", parent=s["title"], fontSize=18, leading=22, spaceAfter=10)
        if two_page_onboarding:
            s["body"] = ParagraphStyle("onboarding-readable-body", parent=s["body"], fontSize=12.5, leading=18, spaceAfter=9)
            s["heading"] = ParagraphStyle("onboarding-readable-heading", parent=s["heading"], fontSize=14, leading=20, spaceBefore=8, spaceAfter=12)
            s["title"] = ParagraphStyle("onboarding-readable-title", parent=s["title"], fontSize=20, leading=27, spaceAfter=18)
    de = doc.get("contractDetails", {}).get("language") == "de"
    story = [Paragraph(plain(doc["title"], 180), s["title"])]
    client_layout = doc.get("category") == "clients" and not onboarding and len([r for r in doc.get("recipients", []) if r.get("role") != "marketizo"]) == 1
    intro = client_identity_intro(doc, payload.get("issuer", {}), s, de) if client_layout else None
    if intro:
        story.extend(intro[0])
    for recipient in ([] if client_layout else doc.get("recipients", [])):
        if onboarding or recipient.get("role") == "marketizo" or (not doc.get("recipientCompletion") and not any(recipient.get(k) for k in ("address", "taxId", "registrationId"))):
            continue
        info = [recipient.get("company") or recipient.get("name", "")]
        if recipient.get("company") and recipient.get("name"): info.append(("Vertreten durch: " if de else "Zastupnik: ") + recipient["name"])
        if recipient.get("country"): info.append(("Land: " if de else "Zemlja: ") + recipient["country"])
        if recipient.get("personalId"): info.append(("Identifikationsnummer: " if de else "JMBG / identifikacioni broj: ") + recipient["personalId"])
        if recipient.get("capacity"): info.append(("Funktion: " if de else "Funkcija: ") + recipient["capacity"])
        if recipient.get("address"): info.append(("Anschrift: " if de else "Adresa: ") + recipient["address"])
        if recipient.get("taxId"): info.append(("Steuernummer: " if de else "Poreski broj: ") + recipient["taxId"])
        if recipient.get("registrationId"): info.append(("Registernummer: " if de else "Registracioni broj: ") + recipient["registrationId"])
        story.append(Paragraph("<br/>".join(plain(v, 400) for v in info), s["small"]))
    blocks = intro[1] if intro else doc["content"]["blocks"]
    if client_layout and not intro:
        story.extend(generic_client_identity(doc, payload.get("issuer", {}), s, de))
    if len(blocks) > 500:
        raise ValueError("Too many blocks")
    count = 0
    for block in blocks:
        # Imported templates can contain empty Word paragraphs; keep only visible content.
        block_text = "".join(run["text"] for run in block["runs"]).strip()
        if not block_text:
            continue
        if two_page_onboarding and block_text == "Rezultati i zajedničke obaveze":
            story.append(PageBreak())
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
        is_heading = block["type"] == "heading" or (len(block_text) < 160 and re.match(r"^(?:Član|Artikel|Abschnitt|Article|§)\s*\d+", block_text))
        if onboarding and (re.match(r"^[1-9]\.\s+[^\n]{1,100}$", block_text) or block_text == "Potvrda sa onboarding sastanka"):
            is_heading = True
        story.append(Paragraph(text or "<br/>", s["heading"] if is_heading else s["body"]))
    # No internal notes, signature metadata or disclaimer is added to the agreement.
    # The exact original bytes are what every signer previews and accepts.
    issuer = dict(payload.get("issuer", {}))
    if de and issuer.get("address", "").endswith("Austrija"):
        issuer["address"] = issuer["address"][:-7] + "Österreich"
    details = doc.get("contractDetails", {})
    if "audience" not in details:
        details = dict(details, audience="employee" if doc.get("category") == "employees" else "client" if doc.get("category") == "clients" else "other")
    if doc.get("category") == "other" and doc.get("note", "").startswith("marketizo-codeks:v1|"):
        details = dict(details, audience="codeks")
    parties = doc.get("recipients", [])
    owners = [p for p in parties if p.get("role") == "marketizo"]
    others = [p for p in parties if p.get("role") != "marketizo"] or [{}]
    layouts = []
    for other in others:
        story.append(OnboardingSignatureBlock(other, layouts, compact_onboarding or two_page_onboarding) if onboarding else SignatureBlock(details, issuer, owners[0] if owners else {}, other, layouts))
    data = build_pdf(doc["title"], story, issuer)
    writer = PdfWriter(io.BytesIO(data))
    if two_page_onboarding and len(writer.pages) != 2:
        raise ValueError("Onboarding rules must fit on two A4 pages")
    if compact_onboarding and len(writer.pages) != 1:
        raise ValueError("Onboarding rules must fit on one A4 page")
    writer.add_metadata({"/MarketizoLayout": json.dumps({"version": 1, "blocks": layouts, "issuer": issuer, "language": "de" if de else "sr", "readingIntro": intro[2] if intro else None, "purpose": "onboarding" if onboarding else "codeks" if doc.get("category") == "other" and doc.get("note", "").startswith("marketizo-codeks:v1|") else "contract"}, ensure_ascii=False)})
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
    original_metadata = PdfReader(io.BytesIO(original)).metadata
    if original_metadata:
        writer.add_metadata(original_metadata)
    layout_raw = PdfReader(io.BytesIO(original)).metadata.get("/MarketizoLayout")
    if layout_raw:
        layout = json.loads(layout_raw)
        for block in layout["blocks"]:
            overlay = io.BytesIO()
            from reportlab.pdfgen.canvas import Canvas
            c = Canvas(overlay, pagesize=A4, invariant=1)
            for slot in block["slots"]:
                signer = next((s for s in evidence["signers"] if s.get("email", "").lower() == slot["email"].lower() and slot["email"]), None)
                if not signer and layout.get("purpose") == "onboarding" and not slot["email"] and len(evidence["signers"]) == 1:
                    candidate = evidence["signers"][0]
                    if candidate.get("name", "").strip().casefold() == slot.get("name", "").strip().casefold():
                        signer = candidate
                if not signer:
                    continue
                if signer.get("strokes"):
                    drawing = Drawing(signer["strokes"]); drawing.width, drawing.height = slot["width"], slot["height"]
                    drawing.drawOn(c, slot["x"], slot["y"])
                else:
                    paper_text(c, signer["name"], slot["x"]+5, slot["y"]+35, width=slot["width"]-10, size=14)
                paper_text(c, signed_date(signer["acceptedAt"]), slot.get("dateX", slot["x"]), slot["dateY"]-4, width=slot.get("dateWidth", 230), size=slot.get("dateFontSize", 7))
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


def preview_pdf(payload):
    """Read the exact frozen PDF. Never reconstruct a contract from an editable draft."""
    raw = base64.b64decode(payload.get("pdfBase64", ""), validate=True)
    digest = hashlib.sha256(raw).hexdigest()
    if len(raw) > 1500000 or digest != payload.get("pdfSha256") or not raw.startswith(b"%PDF-"):
        raise ValueError("Preview integrity mismatch")
    reader = PdfReader(io.BytesIO(raw))
    if not 0 < len(reader.pages) <= 150:
        raise ValueError("Unsupported page count")
    layout = json.loads((reader.metadata or {}).get("/MarketizoLayout", "null") or "null") or {}
    pages, full_text = [], []
    issuer = layout.get("issuer", {})
    title = " ".join(str((reader.metadata or {}).get("/Title", "")).split())
    for index, page in enumerate(reader.pages):
        raw_text = page.extract_text(extraction_mode="layout") or ""
        full_text.append(raw_text)
        lines = raw_text.splitlines()
        # Remove only the repeated stationery, which the responsive page renders separately.
        for value in [issuer.get("name"), issuer.get("address"), issuer.get("email")]:
            if value:
                for i, line in enumerate(lines[:8]):
                    if line.strip() == value.strip():
                        lines[i] = ""
                        break
        while lines and not lines[-1].strip(): lines.pop()
        if lines and re.fullmatch(r"Marketizo Digital e\.U\.\s+\d+", lines[-1].strip()): lines.pop()
        blocks, paragraph = [], []
        clause_heading = re.compile(r"^(?:Član|Klauzula|Klausel|Artikel|Abschnitt|Article|§)\s*\d+", re.I)
        if layout.get("purpose") == "onboarding":
            clause_heading = re.compile(r"^(?:[1-9]\.\s+[^\n]{1,100}|Potvrda sa onboarding sastanka|Rezultati i zajedničke obaveze)$")
        numbered_item = re.compile(r"^\d+(?:\.\d+)+(?:[.)])?\s|^\d+[.)]\s")
        in_contract_body = layout.get("purpose") == "onboarding"
        def flush():
            if paragraph:
                value = " ".join(paragraph)
                blocks.append({"text": value, "heading": bool(len(value) < 160 and clause_heading.match(value))})
                paragraph.clear()
        for line in lines:
            value = line.strip()
            if not value:
                flush()
            else:
                columns = re.split(r"\s{3,}", value)
                if len(columns) == 1 and len(line) - len(line.lstrip()) > 35:
                    columns = ["", value]
                if len(columns) > 1:
                    flush()
                    blocks.append({"text": " | ".join(columns), "columns": columns, "heading": False})
                else:
                    # PDF line breaks carry the clause/list structure. Blank lines alone
                    # are insufficient: compact templates have no empty line between items.
                    is_heading = bool(len(value) < 160 and clause_heading.match(value))
                    if is_heading:
                        flush()
                        blocks.append({"text": value, "heading": True})
                        in_contract_body = True
                    elif numbered_item.match(value):
                        flush()
                        paragraph.append(value)
                    elif not in_contract_body:
                        # Keep the title and party particulars on their original lines.
                        flush()
                        blocks.append({"text": value, "heading": value.isupper() and ':' not in value and sum(c.isalpha() for c in value) >= 25})
                    else:
                        paragraph.append(value)
        flush()
        if index == 0 and blocks and blocks[0]["text"] == title:
            blocks.pop(0)
        readable = []
        for block in blocks:
            if block.get("columns") or block["heading"]:
                readable.append(block)
                continue
            # Some imported Word templates put all numbered obligations in one
            # ReportLab paragraph, so even the PDF lines have inline item numbers.
            # Insert display boundaries only; retain every word in its original order.
            value = block["text"]
            boundaries = r"(?<!\S)(?=\d{1,2}\.\d{1,2}\s+[A-ZÄÖÜČĆŽŠĐ])|(?<!\S)(?=•\s)"
            if index == 0 and not any(clause_heading.match(b["text"]) for b in readable):
                boundaries += r"|(?=Zwischen:|Adresse:|Firmenbuchnummer:|UID:|Inhaber:|Bank:|IBAN:|und Kunde:|Anschrift:|Vertreten durch:|Vertragsgegenstand:|Između:|Adresa:|Matični broj firme:|Vlasnik:|Banka:|Predmet ugovora:)"
            readable.extend({"text": part.strip(), "heading": False} for part in re.split(boundaries, value) if part.strip())
        pages.append(readable)
    # Older frozen PDFs predate explicit language metadata. Their fixed signature labels identify the language.
    language = layout.get("language") or ("de" if "Unterzeichnet am:" in "\n".join(full_text) else "sr")
    return {"pdfSha256": digest, "language": language, "pages": pages, "issuer": layout.get("issuer", {}), "purpose": layout.get("purpose", "contract"), "readingIntro": layout.get("readingIntro")}


def dispatch(payload):
    if payload.get("action") == "invoice":
        import importlib.util
        spec = importlib.util.spec_from_file_location("billing_pdf", Path(__file__).resolve().parents[1] / "lib" / "billing_pdf.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module.render(payload)
    if payload.get("action") == "preview":
        return preview_pdf(payload)
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
