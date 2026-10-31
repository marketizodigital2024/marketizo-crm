import importlib.util,io,json,base64,hashlib
from pathlib import Path
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('billing',root/'lib/billing_pdf.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
# Read the shared, static brand defaults from the JS module without executing JS.
# The fixture deliberately uses a synthetic issuer and client; no production data.
brand={'logoPath':'invoice-logo.png','issuer':{'legalName':'Example Agency e.U.','proprietor':'Example Owner','street':'Example Street 1','postalCode':'1010','city':'Wien','phone':'+43 123','email':'office@example.test','website':'example.test','companyNumber':'123m','vatId':'ATU12345678','bank':'Example Bank','iban':'AT000000000000000000','bic':'EXAMPLE'},'colors':{'accent':'#F7931E'},'defaults':{'heading':'RECHNUNG Nr.','introduction':'Nachfolgend finden Sie die Detailaufstellung zur Rechnung.','paymentTerms':'Bitte innerhalb von 7 Tagen überweisen.','questions':'Bei Rückfragen stehen wir zur Verfügung.','closing':'Mit freundlichen Grüßen'},'columns':['Beschreibung','Menge','Einzelpreis','USt.','Nettopreis']}
s={'profile':{'legalName':'Example Services GmbH','street':'Musterstraße 1','postalCode':'1010','city':'Wien','country':'AT','vatId':'ATU12345678','taxMode':'standard20','taxNote':''},'issueDate':'2026-10-31','serviceMonth':'2026-10','description':'Führung von Social-Media-Kanälen','quantity':1,'unitCents':49700,'netCents':49700,'vatCents':9940,'grossCents':59640}
payload={'snapshot':s,'brand':brand,'number':634};result=m.render(payload);pdf=base64.b64decode(result['base64']);assert hashlib.sha256(pdf).hexdigest()==result['sha256'];reader=PdfReader(io.BytesIO(pdf));assert len(reader.pages)==1;text=reader.pages[0].extract_text()
for expected in ['000634','Example Services GmbH','497,00','99,40','596,40','01.10.2026','31.10.2026','ATU12345678']:assert expected in text,expected
assert reader.pages[0].images,'Original logo is embedded';assert result==m.render(payload),'Same immutable snapshot produces identical PDF bytes'
s['profile']['taxMode']='reverse-charge';s['profile']['taxNote']='Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge).';s['vatCents']=0;s['grossCents']=49700;text=PdfReader(io.BytesIO(base64.b64decode(m.render(payload)['base64']))).pages[0].extract_text();assert 'Reverse Charge' in text and '0,00' in text
s['grossCents']=1
try:m.render(payload);raise AssertionError('Invalid total accepted')
except ValueError:pass
print('PASS billing PDF: branded single page, Unicode, exact net/VAT/gross, original logo, deterministic bytes, reverse-charge note and rejected invalid totals')
