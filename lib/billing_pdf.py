"""Render immutable invoice snapshots using the existing Marketizo stationery."""
import base64, calendar, hashlib, io, re
from pathlib import Path
from PIL import Image
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle
ROOT=Path(__file__).resolve().parents[1]
# Arial-compatible, redistributable font metrics; embedded for consistent rendering.
for name,filename in [('Invoice','LiberationSans-Regular.ttf'),('InvoiceBold','LiberationSans-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(ROOT/'billing-assets'/filename)))

def money(cents):
    return f'{cents/100:,.2f}'.replace(',','X').replace('.',',').replace('X','.')+' €'

def render(payload):
    s=payload['snapshot']; b=payload['brand']; number=payload['number']; test=payload.get('test') is True; p=s['profile']; issuer=b['issuer']
    if not isinstance(number,int) or not (0 if test else 1)<=number<=999999: raise ValueError('Invalid invoice number')
    for key in ['quantity','unitCents','netCents','vatCents','grossCents']:
        if not isinstance(s[key],int) or s[key]<0: raise ValueError('Invalid amount')
    if s['quantity']<1 or s['quantity']*s['unitCents']!=s['netCents'] or s['netCents']+s['vatCents']!=s['grossCents']: raise ValueError('Invalid total')
    items=s.get('items') or [s]
    if not isinstance(items,list) or not 1<=len(items)<=10: raise ValueError('Invalid invoice items')
    for item in items:
        if any(not isinstance(item.get(k),int) for k in ['quantity','unitCents','netCents','vatCents','grossCents']) or item['quantity']<1 or item['unitCents']<1 or item['quantity']*item['unitCents']!=item['netCents'] or item['netCents']+item['vatCents']!=item['grossCents']: raise ValueError('Invalid item total')
        if item['vatCents']!=(int(item['netCents']*.2+.5) if p['taxMode']=='standard20' else 0): raise ValueError('Invalid VAT')
    if any(sum(x[k] for x in items)!=s[k] for k in ['netCents','vatCents','grossCents']): raise ValueError('Invalid item sum')
    display_items=[]
    for item in items:
        lines=item.get('lines') or [item]
        if not isinstance(lines,list) or not lines or sum(x.get('netCents',0) for x in lines)!=item['netCents']:raise ValueError('Invalid line sum')
        for line in lines:
            if any(not isinstance(line.get(k),int) for k in ['quantity','unitCents','netCents']) or line['quantity']<1 or line['unitCents']<1 or line['quantity']*line['unitCents']!=line['netCents']:raise ValueError('Invalid invoice line')
        display_items.extend(lines)
    if len(display_items)>10:raise ValueError('Too many invoice lines')
    def text(value):
        value=str(value)
        if len(value)>1000 or any(ord(c)<32 for c in value): raise ValueError('Invalid text')
        if any(ord(c) not in pdfmetrics.getFont('Invoice').face.charToGlyph for c in value): raise ValueError('Unsupported invoice character')
        return escape(value)
    out=io.BytesIO(); c=canvas.Canvas(out,pagesize=A4,invariant=1); w,h=A4
    c.setTitle(('ENTWURF / TEST - Rechnung '+str(number).zfill(6)) if test and number else 'TEST - KEIN GÜLTIGER BELEG' if test else 'Rechnung '+str(number).zfill(6));c.setAuthor(issuer['legalName'])
    def para(value,x,y,width=450,size=10,bold=False):
        par=Paragraph(text(value),ParagraphStyle('invoice',fontName='InvoiceBold' if bold else 'Invoice',fontSize=size,leading=size*1.25))
        _,height=par.wrap(width,1000);par.drawOn(c,x,y-height);return height
    # Render the official MD asset without stretching its shape or changing the file.
    logo=Image.open(ROOT/b['logoPath']);lw,lh=logo.size
    bounds=logo.getchannel('A').getbbox() if 'A' in logo.getbands() else (0,0,lw,lh)
    if not bounds:raise ValueError('Empty invoice logo')
    x0,y0,x1,y1=bounds;scale=min(100/(x1-x0),82/(y1-y0))
    left=480+(100-(x1-x0)*scale)/2;bottom=h-108+(82-(y1-y0)*scale)/2
    def draw_brand():
        c.drawImage(ImageReader(logo),left-x0*scale,bottom-(lh-y1)*scale,width=lw*scale,height=lh*scale,mask='auto')
        for i,v in enumerate([issuer['phone'],issuer['email'],issuer['website']]):para(v,70,h-50-i*13,size=9)
        c.setStrokeColor(colors.HexColor(b['colors']['accent']));c.setLineWidth(2);c.line(70,h-104,476,h-104)
    page=1
    def draw_footer():
        c.setStrokeColor(colors.HexColor('#595959'));c.setLineWidth(2);c.line(70,70,526,70)
        footer=[[issuer['proprietor'],issuer['street'],issuer['postalCode']+' '+issuer['city']],['Firmenbuchnummer '+issuer['companyNumber'],'UID '+issuer['vatId']],[issuer['bank'],'IBAN '+issuer['iban'],'BIC '+issuer['bic']]]
        for x,lines in zip([70,246,429],footer):
            for i,v in enumerate(lines):para(v,x,61-i*7,width=172,size=5.5)
        para('Seite '+str(page),480,84,width=46,size=7)
    def next_page():
        nonlocal page,y
        draw_footer();c.showPage();page+=1;draw_brand()
        para(('ENTWURF / TEST – Rechnung ' if test else 'Rechnung ')+str(number).zfill(6)+' – Fortsetzung',70,h-130,bold=True,size=10)
        y=h-155
    def flow(value,gap=0,size=10,bold=False):
        nonlocal y
        par=Paragraph(text(value),ParagraphStyle('flow',fontName='InvoiceBold' if bold else 'Invoice',fontSize=size,leading=size*1.25))
        _,height=par.wrap(450,1000)
        if y-height<95:next_page()
        par.drawOn(c,70,y-height);y-=height+gap
    draw_brand()
    y=h-152
    for v in [p['legalName'],p['street'],p['postalCode']+' '+p['city'],p['country']]+(['UID: '+p['vatId']] if p['vatId'] else []):y-=para(v,70,y,width=340,size=10)+2
    date='.'.join(reversed(s['issueDate'].split('-')))
    para('Wien, '+date,430,h-244,width=120)
    para(('ENTWURF / TEST – Rechnung '+str(number).zfill(6) if test and number else 'TEST – KEIN GÜLTIGER BELEG' if test else b['defaults']['heading']+' '+str(number).zfill(6)),70,h-284,bold=True,size=14)
    if test and number:para('KEIN GÜLTIGER BELEG – Nummer noch nicht reserviert',70,h-306,size=8)
    para(b['defaults']['introduction'],70,h-316)
    vat='20 %' if p['taxMode']=='standard20' else '0 %'
    item_rows=[[Paragraph(text(item['description']),ParagraphStyle('description',fontName='Invoice',fontSize=10,leading=13)),str(item['quantity']),money(item['unitCents']),vat,money(item['netCents'])] for item in display_items]
    rows=[b['columns']]+item_rows+[['','','Nettosumme','',money(s['netCents'])],['','','Umsatzsteuer '+vat,'',money(s['vatCents'])],['','','Bruttosumme','',money(s['grossCents'])]]
    table=Table(rows,colWidths=[205,48,89,47,67],repeatRows=1);table.setStyle(TableStyle([('FONTNAME',(0,0),(-1,-1),'Invoice'),('FONTNAME',(0,0),(-1,0),'InvoiceBold'),('FONTNAME',(2,-1),(-1,-1),'InvoiceBold'),('FONTSIZE',(0,0),(-1,-1),9),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#F7CAAC')),('BACKGROUND',(2,-1),(-1,-1),colors.HexColor('#F7CAAC')),('ALIGN',(1,1),(-1,-1),'RIGHT'),('ALIGN',(2,len(display_items)+1),(3,-1),'LEFT'),('SPAN',(2,len(display_items)+1),(3,len(display_items)+1)),('SPAN',(2,len(display_items)+2),(3,len(display_items)+2)),('SPAN',(2,len(display_items)+3),(3,len(display_items)+3)),('NOSPLIT',(0,-4),(-1,-1)),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),2),('RIGHTPADDING',(0,0),(-1,-1),2),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('LINEBELOW',(0,len(display_items)),(-1,len(display_items)),.5,colors.black)]))
    y=h-352
    while True:
        _,th=table.wrap(456,10000)
        if th<=y-95:
            table.drawOn(c,70,y-th);y-=th+24;break
        parts=table.split(456,y-95)
        if not parts:
            if page>1:raise ValueError('Invoice row exceeds printable page')
            next_page();continue
        first=parts[0];_,fh=first.wrap(456,10000);first.drawOn(c,70,y-fh)
        table=parts[1];next_page()
    year,month=map(int,s['serviceMonth'].split('-'));last=calendar.monthrange(year,month)[1]
    flow(f'Leistungszeitraum: 01.{month:02d}.{year} – {last:02d}.{month:02d}.{year}',10)
    if p['taxMode']!='standard20':flow(p['taxNote'],10)
    if s.get('note'):flow(s['note'],10)
    flow('Zahlungsbedingung: '+b['defaults']['paymentTerms'],10)
    # Keep the beneficiary, bank details and reference together on one page.
    if y-58<95:next_page()
    flow('Zahlungsempfänger: '+issuer.get('accountHolder',issuer['legalName']),4,size=9,bold=True)
    iban=' '.join(issuer['iban'][i:i+4] for i in range(0,len(issuer['iban']),4))
    flow('IBAN: '+iban+' · BIC: '+issuer['bic'],4,size=9)
    flow('Verwendungszweck: Rechnung '+str(number).zfill(6),12,size=9)
    flow(b['defaults']['questions'],12)
    if y-50<95:next_page()
    flow(b['defaults']['closing'],10)
    flow(issuer['legalName'])
    draw_footer()
    c.showPage();c.save();data=out.getvalue();return{'base64':base64.b64encode(data).decode(),'sha256':hashlib.sha256(data).hexdigest()}
