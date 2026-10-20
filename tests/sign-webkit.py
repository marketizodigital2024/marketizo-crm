"""Mobile WebKit reader regression; local fixture PDF only, no production auth or SMTP."""
import base64, hashlib, importlib.util, json, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sign_helper', ROOT/'api/sign-helper.py')
helper = importlib.util.module_from_spec(spec); spec.loader.exec_module(helper)
blocks = []
for n in range(1, 25):
    blocks += [{'type':'heading','runs':[{'text':f'Član {n}. Tehnički primer dugog ugovora'}]}, {'type':'paragraph','runs':[{'text':('Ovo je neobavezujući test čitljivosti dugog dokumenta na telefonu. Nijednim pregledom ne nastaju poslovne obaveze. ' * 5)}]}]
source = helper.render_original({'issuer':{'name':'Marketizo Digital e.U.','address':'Wien','email':'office@example.invalid'},'document':{'title':'WebKit long fixture','category':'clients','contractDetails':{'audience':'client','language':'sr','place':'Wien','startDate':''},'recipients':[{'name':'Fixture Reader','email':'fixture@example.invalid'}],'content':{'version':1,'blocks':blocks}}})
PDF = base64.b64decode(source['base64']); accepted = []
POLYFILL_PROBE = "delete Map.prototype.getOrInsertComputed; delete Map.prototype.getOrInsert; delete Uint8Array.prototype.toHex; if(globalThis.Iterator)delete Iterator.prototype.map;\n"
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**k): super().__init__(*a,directory=str(ROOT),**k)
    def log_message(self,*a): pass
    def do_GET(self):
        path=urlparse(self.path)
        if path.path=='/api/sign-public':
            if 'action=pdf' in path.query:
                self.send_response(200);self.send_header('Content-Type','application/pdf');self.send_header('X-Document-SHA256',source['sha256']);self.end_headers();self.wfile.write(PDF);return
            payload={'ok':True,'verified':True,'accepted':False,'title':'WebKit long fixture','name':'Fixture Reader','signerEmail':'fixture@example.invalid','email':'f***@example.invalid','status':'open','pdfSha256':source['sha256'],'issuer':{'name':'Marketizo Digital e.U.'},'consentText':'Neobavezujući test prikaza. Potpisivanje zahteva zasebnu izričitu radnju.'}
            self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(payload).encode());return
        if path.path.endswith('/pdf.worker.legacy.min.mjs'):
            self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(POLYFILL_PROBE.encode()+(ROOT/'vendor/pdfjs/pdf.worker.legacy.min.mjs').read_bytes());return
        return super().do_GET()
    def do_POST(self):
        accepted.append(self.path);self.send_response(409);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b'{"ok":false,"error":"Read-only browser fixture"}')
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.webkit.launch()
        context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)
        context.add_init_script(POLYFILL_PROBE)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{server.server_port}/sign.html')
        page.wait_for_function("document.getElementById('documentPages').getAttribute('aria-busy')==='false' && !document.getElementById('acceptDocument').disabled",timeout=60000)
        assert page.locator('#message').inner_text()==''
        assert page.locator('#readingMode').get_attribute('aria-pressed')=='true'
        count=page.locator('.reading-page').count();assert count>=4, count
        assert page.locator('#documentText').is_visible()
        assert page.locator('.reading-page p:not(.reading-page-label)').first.evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')>=18
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
        page.locator('#zoomIn').click();assert page.locator('#zoomValue').inner_text()=='20 px'
        page.locator('#nextPage').click();page.wait_for_function("document.getElementById('pageCounter').textContent.startsWith('2 /')")
        page.locator('#paperMode').click();page.locator('#zoomIn').click();assert page.locator('#zoomValue').inner_text()=='125%'
        assert page.locator('#documentViewport').evaluate('(e)=>e.scrollWidth>e.clientWidth')
        page.get_by_role('button',name=f'Strana {count}',exact=True).click()
        page.wait_for_function("document.getElementById('pageCounter').textContent.startsWith('"+str(count)+" /')")
        page.locator('#startSigning').click();assert page.locator('#signatureDialog').is_visible()
        page.locator('#closeSignatureDialog').click();page.locator('#readingMode').click()
        assert not accepted, accepted
        assert not errors, errors
        out=ROOT/'browser-results';out.mkdir(exist_ok=True)
        page.get_by_role('button',name='Strana 1',exact=True).click();page.wait_for_function("document.getElementById('pageCounter').textContent.startsWith('1 /')");page.screenshot(path=str(out/'sign-webkit-mobile-reading.png'))
        page.locator('#paperMode').click();page.locator('#fitWidth').click();page.wait_for_function("document.querySelector('#documentPages canvas').width>1");page.screenshot(path=str(out/'sign-webkit-mobile-pdf.png'))
        browser.close()
        print(f'PASS: real mobile WebKit renders {count} PDF pages with missing modern builtins, readable text, zoom, page navigation and signature dialog; zero automatic accepts or emails.')
finally:
    server.shutdown();server.server_close()
