import importlib.util,io,json,base64,os,subprocess
from pathlib import Path
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('billing',root/'lib/billing_pdf.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
js="const c=require('./lib/billing-content.js'),f=require('./tests/billing-groups-fixture.cjs'),p=f.payload();console.log(JSON.stringify({brand:c.brand,snapshots:{'test-separate-one':c.snapshotFor(p,f.input(f.ids.recipient)),'test-separate-two':c.snapshotFor(p,f.input(f.ids.project)),'test-group':c.snapshotFor(p,f.groupInput())}}));"
payload=json.loads(subprocess.run([os.environ.get('BILLING_NODE','node'),'-e',js],cwd=root,check=True,capture_output=True,text=True).stdout)
out=Path(os.environ['BILLING_PDF_FIXTURE']) if os.environ.get('BILLING_PDF_FIXTURE') else None
if out:out.mkdir(parents=True,exist_ok=True)
for name,s in payload['snapshots'].items():
 p={'snapshot':s,'brand':payload['brand'],'number':0,'test':True};pdf=base64.b64decode(m.render(p)['base64']);reader=PdfReader(io.BytesIO(pdf));assert len(reader.pages)==1;text=reader.pages[0].extract_text();assert 'TEST' in text
 if len(s['items'])==2:
  assert 'Green Project' in text and 'House Project' in text
  for value in ['1.994,00','398,80','2.392,80']:assert value in text,value
 if out:(out/(name+'.pdf')).write_bytes(pdf)
print('PASS three synthetic PDFs: shared recipient/separate documents and a single two-line grouped invoice, one page each')

extra_js="const c=require('./lib/billing-content.js'),f=require('./tests/billing-groups-fixture.cjs');console.log(JSON.stringify({brand:c.brand,snapshot:c.snapshotFor(f.payload(),{...f.groupInput(),extraItems:[{clientId:f.ids.member,description:'Additional filming',quantity:2,unitCents:15000}],note:'Additional work agreed with the client.'}),number:0,test:true}));"
extra=json.loads(subprocess.run([os.environ.get('BILLING_NODE','node'),'-e',extra_js],cwd=root,check=True,capture_output=True,text=True).stdout)
raw=base64.b64decode(m.render(extra)['base64']);reader=PdfReader(io.BytesIO(raw));text=reader.pages[0].extract_text();assert len(reader.pages)==1
for value in ['Additional filming','Additional work agreed with the client.','2.294,00','458,80','2.752,80']:assert value in text,value
if os.environ.get('BILLING_EXTRA_PDF') :Path(os.environ['BILLING_EXTRA_PDF']).write_bytes(raw)
print('PASS additional work and note render with exact aggregate totals and three visible lines on one page')
