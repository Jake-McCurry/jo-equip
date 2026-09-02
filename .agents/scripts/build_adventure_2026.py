import sys, html, re, json, base64
sys.path.insert(0,'/tmp/pymupdf-inspect')
import pymupdf as fitz
SRC='attached_assets/The_Adventure_of_Living_with_Jesus_1788371751778.pdf'
OUT='/tmp/adventure-2026.html'
doc=fitz.open(SRC)

def esc(s): return html.escape(s, quote=False)
def block_html(page,b):
    if b.get('type') == 1 and b.get('image'):
        mime = 'image/jpeg' if b.get('ext') in ('jpg', 'jpeg') else f"image/{b.get('ext', 'png')}"
        data = base64.b64encode(b['image']).decode()
        return f'<figure class="source-graphic"><img src="data:{mime};base64,{data}" /></figure>'
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
    if '_' in text:
        separated = []
        for raw in (' '.join(s['text'] for s in l['spans']).strip() for l in lines):
            if not raw:
                continue
            if 'Q:' in raw:
                before, question = raw.split('Q:', 1)
                if '_' in before:
                    separated.append(f'<p class="blank" aria-label="{esc(before.strip())}">{esc(before.strip())}</p>')
                separated.append(f'<p class="question">Q:{esc(question)}</p>')
            elif raw.replace('_', '').strip() == '':
                separated.append(f'<p class="blank" aria-label="{esc(raw)}">{esc(raw)}</p>')
            else:
                separated.append(f'<p class="">{esc(raw)}</p>')
        return ''.join(separated)
    if size>=15.5:return f'<h1 class="chapter-banner">{content}</h1>'
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
  blocks=page.get_text('dict')['blocks']
  body='\n'.join(block_html(page,b) for b in blocks)
  if pi==1: sections.append(f'<section class="front notices">{body}</section>')
  elif pi==2: sections.append(f'<section class="toc">{body}</section>')
  else: sections.append(body)
content='\n'.join(sections)
# Wrap each Go Deeper heading plus its immediately following linked paragraph in a card.
content=re.sub(r'<h2><strong>Go Deeper</strong></h2>\s*(<p[^>]*>.*?</p>)',r'<aside class="go-deeper"><h1>Go Deeper</h1>\1</aside>',content,flags=re.S)
# Give each prompt and its writing lines a distinct response area.
content=re.sub(r'(<p class="question">.*?</p>)(\s*(?:<p class="blank".*?</p>\s*)+)',r'<section class="response-card">\1\2</section>',content,flags=re.S)
content=re.sub(
    r'(<section class="response-card"><p class="question">Q: According to Galatians 5:16-23, contrast the two ways of living:</p>.*?)</section>\s*(<p class="">The Spirit-Directed Life</p>\s*(?:<p class="blank".*?</p>\s*)+)',
    r'\1\2</section>',
    content,
    flags=re.S,
)
# Narrative testimonies and lived examples are visually distinct from teaching.
story_patterns = [
    (r'(<h2><strong>My Heart, Christ’s Home</strong></h2>.*?)(?=<h2><strong>Walking the Path Ahead)', 'story-home'),
    (r'(<p class=""><em><strong>Ashley’s Story</strong></em></p>.*?)(?=<h2><strong>Growth is God’s Plan)', 'story-person'),
    (r'(<p class=""><strong>Todd’s Story</strong></p>.*?)(?=<h2><strong>A Simple Step of Surrender)', 'story-person'),
    (r'(<p class=""><strong>Joni’s Story</strong></p>.*?)(?=<h2><strong>Victorious Faith)', 'story-person'),
]
for pattern, cls in story_patterns:
    content = re.sub(pattern, rf'<aside class="story-card {cls}">\1</aside>', content, flags=re.S)
content=re.sub(r'(<p class="">The Holy Spirit actively gives us His supernatural love.*?</p>\s*<p class="">This supernatural love.*?</p>)',r'<aside class="story-card story-person">\1</aside>',content,flags=re.S)
# The final resources become a visual three-card directory without adding copy.
content=content.replace('<h1 class="chapter-banner"><strong>Additional Resources</strong></h1>', '<section class="resources"><h1 class="chapter-banner"><strong>Additional Resources</strong></h1>') + '</section>'
content=re.sub(r'(<h2><strong>(?:JO App|JO EQUIP|More from JesusOnline)</strong></h2>\s*<p[^>]*>.*?</p>\s*<p[^>]*>.*?</p>)',r'<div class="resource-card">\1</div>',content,flags=re.S)
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
.blank{height:1.35em;border-bottom:2px solid #718096;color:transparent;overflow:hidden;margin:.1em 0 .7em}
.response-card{break-inside:avoid;margin:1em 0;padding:.8em 1em .55em;background:#f8fafc;border:1px solid #d4dde7;border-radius:6px}
.response-card .question{margin-top:0;font-family:Carlito,Calibri,sans-serif;font-weight:700;color:#173f5f}
.go-deeper{page-break-inside:avoid;margin:1.4em 0;padding:.8em 1em .9em;border:1px solid #cfe3f2;border-left:5px solid #0083de;background:#f2f8fd;border-radius:3px}
.go-deeper h1{page-break-before:auto;text-align:left;font:700 14pt Carlito,Calibri,sans-serif;margin:0 0 .3em;color:#0b3c5d}.go-deeper p,.go-deeper h2{margin:0;font:400 12pt Carlito,Calibri,sans-serif}
.go-deeper + .chapter-banner{page-break-before:auto;margin-top:1.3em}
.chapter-banner{padding:.42em .6em;color:#fff;background:linear-gradient(110deg,#0b3c5d,#176c9b);border-radius:6px;box-shadow:0 3px 0 #d6a548}
.chapter-banner strong{color:#fff}
.toc .chapter-banner{color:#fff}
.story-card{break-inside:avoid;margin:1.1em 0;padding:1em 1.05em;background:#f7f3e9;border:1px solid #e1d4b8;border-left:5px solid #d6a548;border-radius:5px}
.story-card h2,.story-card p:last-child{margin-bottom:0}.story-card .quote{margin-left:.25in}
.source-graphic{break-inside:avoid;margin:1em auto;padding:.6em;text-align:center;background:#f2f8fd;border:1px solid #cfe3f2;border-radius:8px}
.source-graphic img{display:block;max-width:100%;height:auto;margin:auto}
.resources{page-break-before:always}.resources .chapter-banner{page-break-before:auto}
.resource-card{position:relative;break-inside:avoid;margin:1em 0;padding:.75em 1em .6em 1.05in;background:#eef6fb;border:1px solid #cfe3f2;border-radius:9px;min-height:.92in}
.resource-card h2{margin:0 0 .2em}.resource-card p{margin:0 0 .25em}.resource-card:before{content:"";position:absolute;left:.25in;top:.2in;width:.5in;height:.5in;border:3px solid #0083de;border-radius:10px;box-shadow:inset 0 0 0 5px #eef6fb;background:#0b3c5d}
.resource-card:nth-of-type(2):before{border-radius:50%;background:linear-gradient(135deg,#0083de 0 45%,#d6a548 45% 58%,#0b3c5d 58%)}
.resource-card:nth-of-type(3):before{border-radius:50% 50% 8px 8px;background:linear-gradient(#0b3c5d 0 28%,#fff 28% 36%,#0083de 36%)}
'''
Path=None
open(OUT,'w').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{content}</body></html>')
print(json.dumps({'pages':doc.page_count,'links':sum(len(p.get_links()) for p in doc),'html':OUT}))
