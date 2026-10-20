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
        return {"title": "Ugovor o uslugama - Čćžšđ ÄÖÜ", "content": {"version": 1, "blocks": [
            {"type": "heading", "runs": [{"text": "Član 1. Predmet ugovora", "bold": True}]},
            {"type": "paragraph", "runs": [{"text": "Test dokument. Ovo nije ugovor sa stvarnim klijentom. " * 12}]},
            {"type": "ordered", "runs": [{"text": "Prva obaveza"}]},
            {"type": "ordered", "runs": [{"text": "Druga obaveza", "italic": True}]},
        ] + [{"type": "paragraph", "runs": [{"text": "Dogovoreni uslovi i precizne obaveze. " * 24}]} for _ in range(9)]}}

    def test_pdf_and_incremental_receipt(self):
        original = helper.render_original({"document": self.document()})
        original_bytes = base64.b64decode(original["base64"])
        first = PdfReader(io.BytesIO(original_bytes))
        text = "\n".join(p.extract_text() for p in first.pages)
        self.assertIn("Čćžšđ ÄÖÜ", text)
        self.assertIn("2. Druga obaveza", text)
        self.assertGreater(len(first.pages), 1)
        again = helper.render_original({"document": self.document()})
        self.assertEqual(original["sha256"], again["sha256"])
        manifest = {"title": self.document()["title"], "requestId": "5708299e-1592-4217-96c2-f4f9bc26c067", "signers": [
            {"name": "Test Potpisnik", "email": "test@example.com", "acceptedAt": "2026-10-20T10:00:00Z", "consentText": "Pročitao/la sam ugovor i želim da ga potpišem jednostavnim elektronskim potpisom.", "strokes": [[[.1,.8],[.4,.2],[.7,.6]]]},
            {"name": "Drugi Potpisnik", "email": "other@example.com", "acceptedAt": "2026-10-20T10:05:00Z", "consentText": "Prihvatam prikazanu verziju ugovora.", "strokes": []}
        ]}
        final = helper.render_final({"originalBase64": original["base64"], "originalSha256": original["sha256"], "evidence": manifest, "manifestSha256": "a"*64})
        final_bytes = base64.b64decode(final["base64"])
        self.assertTrue(final_bytes.startswith(original_bytes))
        reader = PdfReader(io.BytesIO(final_bytes))
        self.assertGreater(len(reader.pages), len(first.pages))
        self.assertIn("Test Potpisnik", "\n".join(p.extract_text() for p in reader.pages))
        self.assertEqual(hashlib.sha256(final_bytes).hexdigest(), final["sha256"])
        output = os.environ.get("SIGN_PDF_FIXTURE_OUTPUT")
        if output:
            Path(output).write_bytes(final_bytes)

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


if __name__ == "__main__":
    unittest.main()
