import base64
import hashlib
import hmac
import importlib.util
import io
import json
import os
from pathlib import Path
import time
import unittest
from unittest.mock import patch, MagicMock
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("sign_helper", ROOT / "api/sign-helper.py")
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


class SignPdfTests(unittest.TestCase):
    def document(self):
        return {"recipients": [{"name":"Test Potpisnik","email":"test@example.com"},{"name":"Drugi Potpisnik","email":"other@example.com"}], "title": "Ugovor o uslugama - Čćžšđ ÄÖÜ", "content": {"version": 1, "blocks": [
            {"type": "heading", "runs": [{"text": "Član 1. Predmet ugovora", "bold": True}]},
            {"type": "paragraph", "runs": [{"text": "Test dokument. Ovo nije ugovor sa stvarnim klijentom. " * 12}]},
            {"type": "ordered", "runs": [{"text": "Prva obaveza"}]},
            {"type": "ordered", "runs": [{"text": "Druga obaveza", "italic": True}]},
        ] + [{"type": "paragraph", "runs": [{"text": "Dogovoreni uslovi i precizne obaveze. " * 24}]} for _ in range(9)]}}

    def test_preview_preserves_compact_german_and_serbian_structure(self):
        for heading in ['Klausel 1: Leistungsbeschreibung', 'Klauzula 1: Opis usluga']:
            doc = self.document()
            doc['content']['blocks'] = [
                {'type': 'paragraph', 'runs': [{'text': heading}]},
                {'type': 'paragraph', 'runs': [{'text': '1.1 Kreativni dizajn i strategija.'}]},
                {'type': 'paragraph', 'runs': [{'text': '1.2 Produkcija i objavljivanje. ' * 12}]},
                {'type': 'paragraph', 'runs': [{'text': heading.replace('1:', '2:')}]},
                {'type': 'paragraph', 'runs': [{'text': '2.1 Sledeca obaveza klijenta.'}]},
            ]
            rendered = helper.render_original({'document': doc})
            raw = base64.b64decode(rendered['base64'])
            preview = helper.preview_pdf({'pdfBase64': rendered['base64'], 'pdfSha256': rendered['sha256']})
            blocks = [b for page in preview['pages'] for b in page]
            self.assertTrue(any(b['text'] == heading and b['heading'] for b in blocks))
            self.assertTrue(any(b['text'] == '1.1 Kreativni dizajn i strategija.' and not b['heading'] for b in blocks))
            self.assertTrue(any(b['text'].startswith('1.2 Produkcija') for b in blocks))
            # Formatting may only change whitespace, never add, omit or reorder words.
            extracted = '\n'.join(p.extract_text(extraction_mode='layout') for p in PdfReader(io.BytesIO(raw)).pages)
            visible = ' '.join(b['text'] for b in blocks)
            for item in doc['content']['blocks']:
                text = item['runs'][0]['text']
                self.assertIn(''.join(text.split()), ''.join(visible.split()))
            self.assertEqual(preview['pdfSha256'], hashlib.sha256(raw).hexdigest())

    def test_pdf_and_incremental_receipt(self):
        original = helper.render_original({"document": self.document()})
        original_bytes = base64.b64decode(original["base64"])
        first = PdfReader(io.BytesIO(original_bytes))
        text = "\n".join(p.extract_text() for p in first.pages)
        self.assertIn("Čćžšđ ÄÖÜ", text)
        self.assertIn("2. Druga obaveza", text)
        self.assertGreater(len(first.pages), 1)
        self.assertEqual(original["renderer"], "marketizo-pdf-5")
        self.assert_stationery(first)
        again = helper.render_original({"document": self.document()})
        self.assertEqual(original["sha256"], again["sha256"])
        manifest = {"title": self.document()["title"], "requestId": "5708299e-1592-4217-96c2-f4f9bc26c067", "signers": [
            {"name": "Test Potpisnik", "email": "test@example.com", "acceptedAt": "2026-10-20T10:00:00Z", "consentText": "Pročitao/la sam ugovor i želim da ga potpišem jednostavnim elektronskim potpisom.", "strokes": [[[.1,.8],[.4,.2],[.7,.6]]]},
            {"name": "Drugi Potpisnik", "email": "other@example.com", "acceptedAt": "2026-10-20T10:05:00Z", "consentText": "Prihvatam prikazanu verziju ugovora.", "strokes": []}
        ]}
        final = helper.render_final({"originalBase64": "\n".join(original["base64"][i:i+76] for i in range(0,len(original["base64"]),76)), "originalSha256": original["sha256"], "evidence": manifest, "manifestSha256": "a"*64})
        final_bytes = base64.b64decode(final["base64"])
        self.assertTrue(final_bytes.startswith(original_bytes))
        reader = PdfReader(io.BytesIO(final_bytes))
        self.assertEqual(len(reader.pages), len(first.pages))
        self.assert_stationery(reader)
        self.assertIn("Test Potpisnik", "\n".join(p.extract_text() for p in reader.pages))
        self.assertEqual(hashlib.sha256(final_bytes).hexdigest(), final["sha256"])
        output = os.environ.get("SIGN_PDF_FIXTURE_OUTPUT")
        if output:
            Path(output).write_bytes(final_bytes)

    def assert_stationery(self, reader):
        for page in reader.pages:
            self.assertGreater(len(page.images), 0, "Logo missing from a PDF page")
            # Paragraph anchors must stay within the printable text frame.
            # pypdf's text matrix drifts on multiline ReportLab paragraphs;
            # use the flowable's transform rather than those inferred baselines.
            positions = []
            page.extract_text(visitor_text=lambda text, cm, tm, font, size:
                              positions.append((text, cm[5])) if text.strip() and cm[5] else None)
            for text, y in positions:
                self.assertGreater(y, 44, text)
                self.assertLess(y, float(page.mediabox.height) - 40, text)

    def test_three_contract_audiences_and_paper_signatures(self):
        for audience, expected in [('client', 'Klijent'), ('employee', 'Zaposleni'), ('contractor', 'Saradnik')]:
            with self.subTest(audience=audience):
                doc = self.document()
                doc['content']['blocks'] = [{'type':'paragraph','runs':[{'text':'NEOBAVEZUJUĆI PRIMER / UNVERBINDLICHES MUSTER'}]}]
                doc['contractDetails'] = {'audience':audience,'place':'Wien','startDate':'2026-11-01'}
                doc['recipients'] = [{'name':'Owner Test','email':'owner@example.invalid','role':'marketizo'}, {'name':'Recipient Test','email':'other@example.invalid','company':'Example PR'}]
                original = helper.render_original({'document':doc, 'issuer':{'name':'Marketizo fixture','address':'Fixture address','email':'office@example.invalid'}})
                before = base64.b64decode(original['base64'])
                reader = PdfReader(io.BytesIO(before))
                self.assertEqual(len(reader.pages), 1)
                text = reader.pages[0].extract_text()
                self.assertIn(expected, text)
                self.assertEqual('Početak saradnje' in text, audience == 'client')
                self.assertNotIn('21:30', text, 'No signing date before actual acceptance')
                layout = json.loads(reader.metadata['/MarketizoLayout'])
                self.assertEqual(len(layout['blocks'][0]['slots']), 2)
                self.assertGreater(layout['blocks'][0]['slots'][0]['y'], 44)
                final = helper.render_final({'originalBase64':original['base64'], 'originalSha256':original['sha256'], 'manifestSha256':'a'*64,
                    'evidence':{'title':doc['title'],'requestId':'fixture','signers':[{'name':'Owner Test','email':'owner@example.invalid','acceptedAt':'2026-10-20T19:30:00Z','consentText':'Fixture only','strokes':[]} ]}})
                after = base64.b64decode(final['base64'])
                self.assertTrue(after.startswith(before))
                signed = PdfReader(io.BytesIO(after))
                self.assertEqual(len(signed.pages), 1, 'Signature belongs on the agreement, without a separate signature page')
                self.assertIn('20.10.2026. 21:30', signed.pages[0].extract_text())

    def test_document_language_is_not_bilingual(self):
        for lang, labels in [('sr', ('Klijent', 'Mesto:', 'Datum potpisa:')), ('de', ('Kunde', 'Ort:', 'Unterzeichnet am:'))]:
            doc = self.document()
            doc['content']['blocks'] = [{'type':'paragraph','runs':[{'text':'Test'}]}]
            doc['contractDetails'] = {'audience':'client','language':lang,'place':'Wien','startDate':'2026-11-01'}
            original = helper.render_original({'document':doc})
            text = '\n'.join(p.extract_text() for p in PdfReader(io.BytesIO(base64.b64decode(original['base64']))).pages)
            for label in labels: self.assertIn(label, text)
            for forbidden in (('Kunde', 'Unterzeichnet am:', 'Beginn der Zusammenarbeit') if lang=='sr' else ('Klijent', 'Datum potpisa:', 'Početak saradnje')):
                self.assertNotIn(forbidden, text)

    def test_finalization_preserves_prebranding_original(self):
        # Previously frozen PDFs must never be re-rendered when branding changes.
        from reportlab.pdfgen import canvas
        legacy = io.BytesIO()
        old = canvas.Canvas(legacy, invariant=1)
        old.drawString(48, 720, "Previously frozen original")
        old.save()
        original = legacy.getvalue()
        final = helper.render_final({"originalBase64": base64.b64encode(original).decode(),
            "originalSha256": hashlib.sha256(original).hexdigest(),
            "evidence": {"title": "Legacy fixture", "requestId": "5708299e-1592-4217-96c2-f4f9bc26c067", "signers": []},
            "manifestSha256": "b" * 64})
        data = base64.b64decode(final["base64"])
        self.assertTrue(data.startswith(original))
        reader = PdfReader(io.BytesIO(data))
        self.assertEqual(len(reader.pages[0].images), 0)
        self.assertGreater(len(reader.pages[-1].images), 0)

    def test_safe_text_and_font_failures(self):
        self.assertEqual(helper.plain("<img src=x>"), "&lt;img src=x&gt;")
        with self.assertRaises(ValueError):
            helper.plain("你好")
        with self.assertRaises(ValueError):
            helper.render_final({"originalBase64": base64.b64encode(b"%PDF-invalid").decode(), "originalSha256": "0"*64})

    def test_hmac_and_encrypted_smtp_only(self):
        secret = "a"*48
        now = str(int(time.time()))
        raw = b'{"action":"render"}'
        signature = hmac.new(secret.encode(), now.encode()+b'.'+raw, hashlib.sha256).hexdigest()
        with patch.dict(os.environ, {"SIGN_INTERNAL_SECRET": secret}):
            self.assertTrue(helper.authorize(raw, now, signature))
            self.assertFalse(helper.authorize(raw+b' ', now, signature))
            self.assertFalse(helper.authorize(raw, "1", signature))
        smtp = MagicMock()
        smtp.__enter__.return_value = smtp
        smtp.send_message.return_value = {}
        with patch.dict(os.environ, {"SIGN_SMTP_HOST":"smtp.example.invalid","SIGN_SMTP_USER":"fixture","SIGN_SMTP_PASSWORD":"fixture","SIGN_MAIL_FROM":"office@marketizo.com","SIGN_SMTP_PORT":"465"}), patch.object(helper.smtplib,"SMTP_SSL",return_value=smtp) as constructor:
            self.assertTrue(helper.send_mail({"id":"fixture","to":"recipient@example.com","subject":"Fixture","text":"Code 123456"})["accepted"])
            constructor.assert_called_once()
            message = smtp.send_message.call_args.args[0]
            self.assertEqual(message["From"], "office@marketizo.com")
            self.assertEqual(message["To"], "recipient@example.com")
            pdf_bytes = b"%PDF-fixture-final"
            attachment = {"base64": base64.b64encode(pdf_bytes).decode(), "sha256": hashlib.sha256(pdf_bytes).hexdigest()}
            self.assertTrue(helper.send_mail({"id":"receipt-fixture","to":"recipient@example.com","subject":"Signed PDF","text":"In attachment","attachment":attachment})["accepted"])
            message = smtp.send_message.call_args.args[0]
            attached = list(message.iter_attachments())
            self.assertEqual(len(attached), 1)
            self.assertEqual(attached[0].get_content_type(), "application/pdf")
            self.assertEqual(attached[0].get_payload(decode=True), pdf_bytes)
            with self.assertRaises(ValueError):
                helper.send_mail({"id":"bad","to":"recipient@example.com","subject":"Bad","text":"Bad","attachment":{**attachment,"sha256":"0"*64}})


if __name__ == "__main__":
    unittest.main()
