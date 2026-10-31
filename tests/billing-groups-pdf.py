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
