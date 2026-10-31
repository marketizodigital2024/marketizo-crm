import importlib.util,io,json,base64,hashlib
from pathlib import Path
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('billing',root/'lib/billing_pdf.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
# Read the shared, static brand defaults from the JS module without executing JS.
# The fixture deliberately uses a synthetic issuer and client; no production data.
brand={'logoPath':'marketizo-logo.png','issuer':{'legalName':'Example Agency e.U.','proprietor':'Example Owner','street':'Example Street 1','postalCode':'1010','city':'Wien','phone':'+43 123','email':'office@example.test','website':'example.test','companyNumber':'123m','vatId':'ATU12345678','bank':'Example Bank','iban':'AT000000000000000000','bic':'EXAMPLE'},'colors':{'accent':'#F7931E'},'defaults':{'heading':'RECHNUNG Nr.','introduction':'Nachfolgend finden Sie die Detailaufstellung zur Rechnung.','paymentTerms':'Bitte innerhalb von 7 Tagen überweisen.','questions':'Bei Rückfragen stehen wir zur Verfügung.','closing':'Mit freundlichen Grüßen'},'columns':['Beschreibung','Menge','Einzelpreis','USt.','Nettopreis']}
s={'profile':{'legalName':'Example Services GmbH','street':'Musterstraße 1','postalCode':'1010','city':'Wien','country':'AT','vatId':'ATU12345678','taxMode':'standard20','taxNote':''},'issueDate':'2026-10-31','serviceMonth':'2026-10','description':'Führung von Social-Media-Kanälen','quantity':1,'unitCents':49700,'netCents':49700,'vatCents':9940,'grossCents':59640}
payload={'snapshot':s,'brand':brand,'number':634};result=m.render(payload);pdf=base64.b64decode(result['base64']);assert hashlib.sha256(pdf).hexdigest()==result['sha256'];reader=PdfReader(io.BytesIO(pdf));assert len(reader.pages)==1;text=reader.pages[0].extract_text()
for expected in ['000634','Example Services GmbH','497,00','99,40','596,40','01.10.2026','31.10.2026','ATU12345678']:assert expected in text,expected
assert reader.pages[0].images,'Official MD logo is embedded';assert reader.pages[0].images[0].image.size==(1920,1080),'Use the existing MD artwork, not the legacy M mark';assert result==m.render(payload),'Same immutable snapshot produces identical PDF bytes'
s['profile']['taxMode']='reverse-charge';s['profile']['taxNote']='Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge).';s['vatCents']=0;s['grossCents']=49700;text=PdfReader(io.BytesIO(base64.b64decode(m.render(payload)['base64']))).pages[0].extract_text();assert 'Reverse Charge' in text and '0,00' in text
s['grossCents']=1
try:m.render(payload);raise AssertionError('Invalid total accepted')
except ValueError:pass
print('PASS billing PDF: branded single page, Unicode, exact net/VAT/gross, original logo, deterministic bytes, reverse-charge note and rejected invalid totals')

s['grossCents']=s['netCents']+s['vatCents'];numbered=m.render({**payload,'test':True});draft=PdfReader(io.BytesIO(base64.b64decode(numbered['base64'])));draft_text=draft.pages[0].extract_text();assert len(draft.pages)==1
for value in ['ENTWURF / TEST','Rechnung 000634','KEIN GÜLTIGER BELEG','Nummer noch nicht reserviert']:assert value in draft_text,value
print('PASS numbered draft: planned 000634 visible with explicit non-accounting/unreserved warning, one page')

for value in ['Zahlungsempfänger: Example Agency e.U.','Verwendungszweck: Rechnung 000634','IBAN: AT00 0000 0000 0000 0000']:assert value in draft_text,value
print('PASS clearly separated beneficiary, IBAN/BIC and invoice payment reference')

# Reproduce the two-line reverse-charge invoice that previously exceeded one page.
import copy
extra_s=copy.deepcopy(s)
extra_s['profile']['taxNote']='Steuerschuldnerschaft des Leistungsempfängers – Reverse Charge gemäß Art. 44 und 196 MwStSystRL.'
extra_s['items']=[dict(description='Monthly social media service',quantity=1,unitCents=199700,netCents=199700,vatCents=0,grossCents=199700),dict(description='Additional filming',quantity=1,unitCents=15000,netCents=15000,vatCents=0,grossCents=15000)]
extra_s.update(quantity=1,unitCents=214700,netCents=214700,vatCents=0,grossCents=214700,note='Keep this invoice note')
extra_pages=PdfReader(io.BytesIO(base64.b64decode(m.render({**payload,'snapshot':extra_s})['base64']))).pages
extra_text='\n'.join(page.extract_text() for page in extra_pages)
for value in ['Additional filming','Keep this invoice note','2.147,00','Verwendungszweck: Rechnung 000634']:assert value in extra_text,value
print('PASS reverse-charge plus additional filming and note no longer fails rendering')

# Long permitted content must paginate without losing rows or monetary totals.
import copy,os
long_s=copy.deepcopy(s);long_s['note']='Additional agreed work. '*12
long_s['profile']['taxNote']='Steuerschuldnerschaft des Leistungsempfängers – Reverse Charge gemäß Art. 44 und 196 MwStSystRL.'
long_s['items']=[]
for i in range(10):
 item={'description':f'Service {i+1:02d}: '+('Detailed filming and editing work for this client. '*8),'quantity':1,'unitCents':10000,'netCents':10000,'vatCents':0,'grossCents':10000}
 long_s['items'].append(item)
long_s.update(quantity=1,unitCents=100000,netCents=100000,vatCents=0,grossCents=100000)
long_payload={**payload,'snapshot':long_s};rendered=m.render(long_payload);raw=base64.b64decode(rendered['base64']);pages=PdfReader(io.BytesIO(raw)).pages
assert len(pages)>1
all_text='\n'.join(page.extract_text() for page in pages)
for i in range(10):assert all_text.count(f'Service {i+1:02d}:')==1
for value in ['Bruttosumme','Verwendungszweck: Rechnung 000634','Additional agreed work.']:assert value in all_text
assert all_text.count('Bruttosumme')==1
assert all(page.images for page in pages),'Brand logo on every page'
assert rendered==m.render(long_payload),'Pagination remains deterministic'
if os.environ.get('BILLING_PAGINATION_PDF'):Path(os.environ['BILLING_PAGINATION_PDF']).write_bytes(raw)
print('PASS long reverse-charge invoice: all ten lines, totals, note and bank reference survive deterministic pagination')
