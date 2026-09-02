import sys, html, re, json
sys.path.insert(0,'/tmp/pymupdf-inspect')
import pymupdf as fitz
SRC='attached_assets/The_Adventure_of_Living_with_Jesus_1788371751778.pdf'
OUT='/tmp/adventure-2026.html'
doc=fitz.open(SRC)

def esc(s): return html.escape(s, quote=False)
def block_html(page,b):
    lines=b.get('lines',[]); spans=[s for l in lines for s in l['spans']]
    if not spans:return ''
    size=max(s['size'] for s in spans); text=' '.join(''.join(s['text'] for s in l['spans']).strip() for l in lines).strip()
    if not text:return ''
    # preserve inline emphasis and source link annotations
    parts=[]
    for l in lines:
      lp=[]
      for s in l['spans']:
        t=esc(s['text']); f=s['font']
        if 'Bold' in f:t=f'<strong>{t}</strong>'
        if 'Italic' in f:t=f'<em>{t}</em>'
        r=fitz.Rect(s['bbox'])
        uri=next((x.get('uri') for x in page.get_links() if x.get('uri') and fitz.Rect(x['from']).intersects(r)),None)
        if uri:t=f'<a href="{html.escape(uri,quote=True)}">{t}</a>'
        lp.append(t)
      parts.append(''.join(lp).strip())
    content=' '.join(x for x in parts if x)
    if size>=15.5:return f'<h1>{content}</h1>'
    if size>=13.5:return f'<h2>{content}</h2>'
    if text.replace('_','').strip()=='':return f'<p class="blank" aria-label="{esc(text)}">{esc(text)}</p>'
    if text.startswith('\uf0b7') or any('\uf0b7' in ''.join(s['text'] for s in l['spans']) for l in lines):
      items=[]
      for raw in re.split(r'\uf0b7', text):
        raw=raw.strip()
        if raw:items.append(f'<li>{esc(raw)}</li>')
      return '<ul>'+''.join(items)+'</ul>'
    cls=[]
    if b['bbox'][0]>95:cls.append('quote')
    if text.startswith('Q:'):cls.append('question')
    return f'<p class="{" ".join(cls)}">{content}</p>'

sections=[]
for pi,page in enumerate(doc):
  if pi==0: continue
  blocks=[b for b in page.get_text('dict')['blocks'] if 'lines' in b]
  body='\n'.join(block_html(page,b) for b in blocks)
  if pi==1: sections.append(f'<section class="front notices">{body}</section>')
  elif pi==2: sections.append(f'<section class="toc">{body}</section>')
  else: sections.append(body)
content='\n'.join(sections)
# Wrap each Go Deeper heading plus its immediately following linked paragraph in a card.
content=re.sub(r'<h2><strong>Go Deeper</strong></h2>\s*(<p[^>]*>.*?</p>)',r'<aside class="go-deeper"><h1>Go Deeper</h1>\1</aside>',content,flags=re.S)
css='''
@page { size: Letter; margin: .78in .88in .82in; }
*{box-sizing:border-box;font-variant-ligatures:none;font-feature-settings:"liga" 0,"clig" 0} body{margin:0;color:#1f2937;font:12pt/1.5 Caladea,Cambria,Georgia,serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.front{page-break-after:always}.front h1,.toc>h1{text-align:center}.subtitle{text-align:center;color:#0083de;font-family:Carlito,Calibri,sans-serif;font-size:13pt;margin-bottom:1.5em}
.notices{font-size:9.5pt;color:#4b5563}.notices>h1{font:300 26pt/1.2 Carlito,Calibri,sans-serif;color:#0b3c5d;margin:.15in 0 .25em}
.toc{page-break-after:always;padding-top:.25in}.toc h1{font:300 28pt Carlito,Calibri,sans-serif;color:#0b3c5d;margin:0 0 .8em}.toc p{padding:.18em .5em;border-bottom:1px dotted #d4dde5;margin:0}
h1{font:300 28pt/1.2 Carlito,Calibri,sans-serif;color:#0b3c5d;text-align:center;page-break-before:always;margin:.25in 0 .7em}
h2{font:700 14pt/1.3 Caladea,Cambria,serif;color:#0b3c5d;margin:1.2em 0 .25em;page-break-after:avoid}
p{margin:0 0 .8em;orphans:3;widows:3} strong{color:#0b3c5d} a{color:#b34800;text-decoration:none}
ul,ol{margin:.45em 0 .9em .55in}li{margin:.25em 0}.quote{margin-left:.5in;font-style:italic}.question{font-weight:400;margin-top:1em;color:#243b53}
.blank{height:1.2em;border-bottom:1px solid #aeb9c5;color:transparent;overflow:hidden;margin:.1em 0 .65em}
.go-deeper{page-break-inside:avoid;margin:1.4em 0;padding:.8em 1em .9em;border:1px solid #cfe3f2;border-left:5px solid #0083de;background:#f2f8fd;border-radius:3px}
.go-deeper h1{page-break-before:auto;text-align:left;font:700 14pt Carlito,Calibri,sans-serif;margin:0 0 .3em;color:#0b3c5d}.go-deeper p,.go-deeper h2{margin:0;font:400 12pt Carlito,Calibri,sans-serif}
'''
Path=None
open(OUT,'w').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{content}</body></html>')
print(json.dumps({'pages':doc.page_count,'links':sum(len(p.get_links()) for p in doc),'html':OUT}))
