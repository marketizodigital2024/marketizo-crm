"""Real WebKit, exact PDF extraction and both languages; never sends email or accepts a contract."""
import base64, importlib.util, json, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('sign_helper',ROOT/'api/sign-helper.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
fixtures={}
for language in ['sr','de']:
    body=('Ovo je neobavezujući test dugog ugovora. Nijednim pregledom ne nastaju poslovne obaveze. ' if language=='sr' else 'Dies ist ein unverbindlicher technischer Test eines langen Vertrags. Durch die Ansicht entstehen keine Verpflichtungen. ')
    blocks=[]
    for n in range(1,25):
        blocks += [{'type':'heading','runs':[{'text':f'{"Član" if language=="sr" else "Abschnitt"} {n}. Test'}]},{'type':'paragraph','runs':[{'text':body*5}]}]
    source=helper.render_original({'issuer':{'name':'Marketizo Digital e.U.','address':'Simmeringer Hauptstraße 24, 1110 Wien','email':'office@example.invalid'},'document':{'title':'TEST — NEOBAVEZUJUĆE' if language=='sr' else 'TEST — UNVERBINDLICH','category':'clients','contractDetails':{'audience':'client','language':language,'place':'Wien'},'recipients':[{'name':'Fixture Reader','email':'fixture@example.invalid'}],'content':{'version':1,'blocks':blocks}}})
    preview=helper.preview_pdf({'pdfBase64':source['base64'],'pdfSha256':source['sha256']})
    assert len(preview['pages'])>=4
    extracted=' '.join(b['text'] for page in preview['pages'] for b in page)
    assert body.split('.')[0] in extracted
    assert ('Član 24' if language=='sr' else 'Abschnitt 24') in extracted
    assert '/327' not in extracted
    fixtures[language]={'source':source,'preview':preview}
active='sr';posts=[]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
    def log_message(self,*a):pass
    def do_GET(self):
        path=urlparse(self.path);f=fixtures[active]
        if path.path=='/api/sign-public':
            if path.query=='action=preview':payload={'ok':True,**f['preview'],'consentText':'Fixture saglasnost.' if active=='sr' else 'Zustimmung zum unverbindlichen Test.'}
            elif path.query=='action=pdf':
                self.send_response(200);self.send_header('Content-Type','application/pdf');self.end_headers();self.wfile.write(base64.b64decode(f['source']['base64']));return
            else:payload={'ok':True,'verified':True,'accepted':False,'title':'TEST — NEOBAVEZUJUĆE' if active=='sr' else 'TEST — UNVERBINDLICH','name':'Fixture Reader','status':'open','pdfSha256':f['source']['sha256'],'issuer':{'name':'Marketizo Digital e.U.'}}
            self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(payload).encode());return
        return super().do_GET()
    def do_POST(self):
        posts.append(self.path);self.send_response(409);self.end_headers();self.wfile.write(b'{"ok":false}')
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.webkit.launch()
        context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)
        # Simulate missing modern PDF engine features and block every PDF.js/worker request entirely.
        context.add_init_script('delete globalThis.Worker; delete Map.prototype.getOrInsertComputed; delete Map.prototype.getOrInsert; delete Uint8Array.prototype.toHex;')
        context.route('**/vendor/pdfjs/**',lambda route:route.abort())
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        out=ROOT/'browser-results';out.mkdir(exist_ok=True)
        for language in ['sr','de']:
            active=language;page.goto(f'http://127.0.0.1:{server.server_port}/sign.html')
            page.wait_for_function("document.getElementById('documentPages').getAttribute('aria-busy')==='false' && !document.getElementById('acceptDocument').disabled",timeout=60000)
            assert page.locator('#message').inner_text()==''
            assert page.locator('html').get_attribute('lang')==language
            assert page.locator('.document-page-text').count()>=4
            assert page.locator('.document-page-text p').first.evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')>=18
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
            assert page.locator('#zoomValue,#pageCounter,#readerToolbar,#pageNavigator').count()==0
            assert '100%' not in page.locator('body').inner_text()
            assert page.locator('#startSigning').inner_text()==('Pređi na potpis' if language=='sr' else 'Zur Unterschrift')
            assert ('Unterschrift' not in page.locator('#signatureSection').inner_text()) if language=='sr' else ('potpis' not in page.locator('#signatureSection').inner_text())
            page.screenshot(path=str(out/f'sign-webkit-mobile-{language}.png'))
            page.locator('#startSigning').click();page.locator('#enlargeSignature').click();assert page.locator('#signatureDialog').is_visible()
            page.locator('#closeSignatureDialog').click()
            assert page.locator('#acceptTerms').is_checked()==False
            assert not posts and not errors
        context.close();browser.close()
        print('PASS: SR and DE long contracts readable in real mobile WebKit without Worker/PDF.js; no technical controls, mixed UI, automatic acceptance or email.')
finally:server.shutdown();server.server_close()
