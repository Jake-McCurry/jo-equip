import sys, html, re, json, base64
sys.path.insert(0,'/tmp/pymupdf-inspect')
import pymupdf as fitz
SRC='attached_assets/The_Adventure_of_Living_with_Jesus_1788371751778.pdf'
OUT='/tmp/adventure-2026.html'
doc=fitz.open(SRC)

def esc(s): return html.escape(s, quote=False)
def vector_diagram(page_number):
    if page_number == 12:
        svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 430">
<rect width="1000" height="430" rx="32" fill="#f7fbfe"/>
<g font-family="Arial, sans-serif" text-anchor="middle">
<rect x="45" y="42" width="420" height="342" rx="28" fill="#fff" stroke="#c8dce9" stroke-width="4"/>
<rect x="535" y="42" width="420" height="342" rx="28" fill="#fff" stroke="#c8dce9" stroke-width="4"/>
<circle cx="255" cy="190" r="105" fill="#e8a62b"/><circle cx="745" cy="190" r="105" fill="#0b5b85"/>
<g stroke="#fff" stroke-width="8" stroke-linecap="round">
<path d="M255 62v22M255 296v22M127 190h22M361 190h22M164 99l16 16M330 265l16 16M346 99l-16 16M180 265l-16 16"/>
<path d="M745 62v22M745 296v22M617 190h22M851 190h22M654 99l16 16M820 265l16 16M836 99l-16 16M670 265l-16 16"/>
</g>
<g fill="none" stroke="#112b46" stroke-width="11" stroke-linejoin="round"><path d="M211 225h88v64h-88zM226 225v-57h58v57"/></g>
<text x="255" y="208" font-size="76" font-weight="700" fill="#112b46">S</text>
<g fill="none" stroke="#fff" stroke-width="11" stroke-linejoin="round"><path d="M701 225h88v64h-88zM716 225v-57h58v57"/></g>
<path d="M745 119v89M712 151h66" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
<text x="118" y="256" font-size="74" font-weight="700" fill="#0b5b85">†</text>
<text x="864" y="245" font-size="62" font-weight="700" fill="#e8a62b">s</text>
<text x="255" y="355" font-size="35" font-weight="700" fill="#112b46">Self-Directed</text>
<text x="745" y="355" font-size="35" font-weight="700" fill="#112b46">Christ-Directed</text>
</g></svg>'''
    elif page_number == 13:
        svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 430">
<rect width="1200" height="430" rx="32" fill="#f7fbfe"/>
<g font-family="Arial, sans-serif" text-anchor="middle">
<g><rect x="35" y="42" width="350" height="342" rx="25" fill="#fff" stroke="#5c6770" stroke-width="8"/><circle cx="210" cy="78" r="38" fill="#5c6770"/><text x="210" y="92" font-size="40" font-weight="700" fill="#fff">1</text><text x="210" y="174" font-size="37" font-weight="700" fill="#263746"><tspan x="210">Choose to yield</tspan><tspan x="210" dy="46">to God.</tspan></text><text x="210" y="300" font-size="28" fill="#52616d">(Romans 12:2)</text></g>
<g><rect x="425" y="42" width="350" height="342" rx="25" fill="#fff" stroke="#e8a62b" stroke-width="8"/><circle cx="600" cy="78" r="38" fill="#e8a62b"/><text x="600" y="92" font-size="40" font-weight="700" fill="#fff">2</text><text x="600" y="174" font-size="37" font-weight="700" fill="#b36b00"><tspan x="600">Confess your</tspan><tspan x="600" dy="46">sins.</tspan></text><text x="600" y="300" font-size="28" fill="#8c651c">(1 John 1:9)</text></g>
<g><rect x="815" y="42" width="350" height="342" rx="25" fill="#fff" stroke="#0b5b85" stroke-width="8"/><circle cx="990" cy="78" r="38" fill="#0b5b85"/><text x="990" y="92" font-size="40" font-weight="700" fill="#fff">3</text><text x="990" y="151" font-size="37" font-weight="700" fill="#0b3c5d"><tspan x="990">Trust God that</tspan><tspan x="990" dy="46">He is in control.</tspan></text><text x="990" y="300" font-size="28" fill="#52616d">(Romans 12:2)</text></g>
</g></svg>'''
    else:
        return None
    return base64.b64encode(svg.encode()).decode()

def image_data(path):
    with open(path, 'rb') as asset:
        return base64.b64encode(asset.read()).decode()

def lesson_visual(path, alt, extra_class=''):
    data = image_data(path)
    return f'<figure class="lesson-visual {extra_class}"><img src="data:image/png;base64,{data}" alt="{html.escape(alt, quote=True)}" /></figure>'

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
content=content.replace('Who Is the Holy Spirit</a>', 'Who Is the Holy Spirit?</a>')
breathing_visual = lesson_visual(
    'artifacts/discipleship-hub/src/assets/books/adventure/spiritual-breathing.png',
    'Spiritual breathing: exhale by confessing your sins and inhale by asking the Holy Spirit to control you.',
)
fruit_visual = lesson_visual(
    'artifacts/discipleship-hub/src/assets/books/adventure/fruit-of-the-spirit.png',
    'Fruit of the Spirit: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control.',
)
trust_visual = lesson_visual(
    'artifacts/discipleship-hub/src/assets/books/adventure/examining-your-trust.png',
    'Checklist for whether friends, recreations, habits, time in God’s Word, and thoughts are helping or hurting.',
)
mind_visual = lesson_visual(
    'artifacts/discipleship-hub/src/assets/books/adventure/what-fills-your-mind.png',
    'Your mind filled by God’s viewpoint and the world’s viewpoint.',
    'mind-visual',
)
content=content.replace(
    '<p class="">Whenever you become aware of sin or self-centeredness, you can turn quickly: confess it, and by faith entrust yourself again to the Spirit’s leadership. He is always ready to restore and empower you.</p>',
    '<p class="">Whenever you become aware of sin or self-centeredness, you can turn quickly: confess it, and by faith entrust yourself again to the Spirit’s leadership. He is always ready to restore and empower you.</p>'
    + breathing_visual
    + '<section class="fruit-section"><h2><strong>Bearing Fruit</strong></h2>'
      '<h3>Fruit of the Spirit</h3>'
      '<p>Jesus compared your life to a branch that is totally dependent on the grapevine. The purpose of the vine is to produce big juicy grapes. The more fruit ... the more the farmer is pleased. The Holy Spirit wants to produce the fruit of the Spirit in your life, which is identified as:</p>'
    + fruit_visual
    + '<p>The Fruit of the Spirit results in a heart that God uses to reach others for Christ. (Read John chapter 15.)</p></section>'
)
content=content.replace(
    '<p class="">What in your life keeps you from trusting God fully— Relationships, finances, plans, habits, past failures, thought life, fear, or the desire for control?</p>',
    '<p class="">What in your life keeps you from trusting God fully— Relationships, finances, plans, habits, past failures, thought life, fear, or the desire for control?</p>'
    + trust_visual
)
content=content.replace(
    '<h2><strong>Examining Your Trust</strong></h2>\n'
    '<p class="">What in your life keeps you from trusting God fully— Relationships, finances, plans, habits, past failures, thought life, fear, or the desire for control?</p>'
    + trust_visual,
    '<section class="visual-topic"><h2><strong>Examining Your Trust</strong></h2>'
    '<p class="">What in your life keeps you from trusting God fully— Relationships, finances, plans, habits, past failures, thought life, fear, or the desire for control?</p>'
    + trust_visual + '</section>'
)
content=content.replace(
    '<p class="">Every day your mind is flooded with the voices and messages around you—most of them reflecting the world’s perspective. What you allow to fill your mind will influence your decisions, attitudes, actions, and direction.</p>',
    '<p class="">Every day your mind is flooded with the voices and messages around you—most of them reflecting the world’s perspective. What you allow to fill your mind will influence your decisions, attitudes, actions, and direction.</p>'
    + mind_visual
)
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
resource_shots = [
    ('JO App', 'artifacts/discipleship-hub/src/assets/books/adventure/jo-app-mobile.png', 'image/png'),
    ('JO EQUIP', 'artifacts/discipleship-hub/src/assets/books/adventure/jo-equip-mobile.jpg', 'image/jpeg'),
    ('More from JesusOnline', 'artifacts/discipleship-hub/src/assets/books/adventure/jesusonline-mobile.png', 'image/png'),
]
for heading, path, mime in resource_shots:
    shot = image_data(path)
    pattern = rf'<div class="resource-card">(<h2><strong>{re.escape(heading)}</strong></h2>.*?</p>\s*<p[^>]*>.*?</p>)</div>'
    content = re.sub(pattern, rf'<div class="resource-card"><img class="site-shot" src="data:{mime};base64,{shot}" /><div class="resource-copy">\1</div></div>', content, flags=re.S)
# Keep every chapter banner with its opening paragraph. Chapters 4 and 7
# explicitly begin on fresh pages per editorial review.
content = re.sub(
    r'(<h1 class="chapter-banner">.*?</h1>\s*<p[^>]*>.*?</p>)',
    r'<section class="chapter-start">\1</section>',
    content,
    flags=re.S,
)
content = re.sub(
    r'<section class="chapter-start">(?=<h1 class="chapter-banner">(?:<strong>)?(?:1\.\s+Citizen of Heaven|4\.\s+Walking by Faith, Not by Feelings|5\.\s+God’s Word – Your Road Map|7\.\s+Belonging to God’s Family|8\.\s+Living a Life of Purpose))',
    r'<section class="chapter-start chapter-start-new-page">',
    content,
)
css='''
@page { size: Letter; margin: .78in .88in .82in; }
*{box-sizing:border-box;font-variant-ligatures:none;font-feature-settings:"liga" 0,"clig" 0} body{margin:0;color:#1f2937;font:12pt/1.5 Caladea,Cambria,Georgia,serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.front{page-break-after:always}.front h1,.toc>h1{text-align:center}.subtitle{text-align:center;color:#0083de;font-family:Carlito,Calibri,sans-serif;font-size:13pt;margin-bottom:1.5em}
.notices{font-size:9.5pt;color:#4b5563}.notices>h1{font:300 26pt/1.2 Carlito,Calibri,sans-serif;color:#0b3c5d;margin:.15in 0 .25em}
.toc{page-break-after:always;padding-top:.25in}.toc h1{font:300 28pt Carlito,Calibri,sans-serif;color:#0b3c5d;margin:0 0 .8em}.toc p{padding:.18em .5em;border-bottom:1px dotted #d4dde5;margin:0}
h1{font:300 28pt/1.2 Carlito,Calibri,sans-serif;color:#0b3c5d;text-align:center;margin:.25in 0 .7em}
h2{font:700 14pt/1.3 Caladea,Cambria,serif;color:#0b3c5d;margin:1.2em 0 .25em;page-break-after:avoid}
h3{font:700 13pt/1.3 Caladea,Cambria,serif;color:#0b3c5d;margin:.7em 0 .25em;page-break-after:avoid}
p{margin:0 0 .8em;orphans:3;widows:3} strong{color:#0b3c5d} a{color:#b34800;text-decoration:none}
ul,ol{margin:.45em 0 .9em .55in}li{margin:.25em 0}.quote{margin-left:.5in;font-style:italic}.question{font-weight:400;margin-top:1em;color:#243b53}
.blank{height:1.35em;border-bottom:2px solid #718096;color:transparent;overflow:hidden;margin:.1em 0 .7em}
.response-card{break-inside:avoid;margin:1em 0;padding:.8em 1em .55em;background:#fff;border:1.5px solid #c5d1dc;border-radius:6px}
.response-card .question{margin-top:0;font-family:Carlito,Calibri,sans-serif;font-weight:700;color:#173f5f}
.go-deeper{page-break-inside:avoid;margin:1.4em 0;padding:.8em 1em .9em;border:1px solid #cfe3f2;border-left:5px solid #0083de;background:#f2f8fd;border-radius:3px}
.go-deeper h1{page-break-before:auto;text-align:left;font:700 14pt Carlito,Calibri,sans-serif;margin:0 0 .3em;color:#0b3c5d}.go-deeper p,.go-deeper h2{margin:0;font:400 12pt Carlito,Calibri,sans-serif}
.chapter-start{break-inside:avoid}.chapter-start-new-page{page-break-before:always}
.chapter-banner{page-break-after:avoid;padding:.42em .6em;color:#fff;background:linear-gradient(110deg,#0b3c5d,#176c9b);border-radius:6px;box-shadow:0 3px 0 #d6a548}
.chapter-banner strong{color:#fff}
.toc .chapter-banner,.resources .chapter-banner{page-break-before:auto;color:#fff}
.story-card{break-inside:avoid;margin:1.1em 0;padding:1em 1.05em;background:#f7f3e9;border:1px solid #e1d4b8;border-left:5px solid #d6a548;border-radius:5px}
.story-card h2,.story-card p:last-child{margin-bottom:0}.story-card .quote{margin-left:.25in}
.source-graphic{break-inside:avoid;margin:1em auto;padding:.5em;text-align:center;background:#fff;border:1px solid #cfdbe4;border-radius:7px}
.source-graphic img{display:block;max-width:100%;height:auto;margin:auto}
.lesson-visual{break-inside:avoid;margin:.9em auto;padding:.42em;text-align:center;background:#fff;border:1px solid #cfdbe4;border-radius:7px}
.lesson-visual img{display:block;max-width:100%;max-height:4.3in;width:auto;height:auto;margin:auto}.lesson-visual.mind-visual img{max-height:5.5in}
.fruit-section,.visual-topic{break-inside:avoid}.fruit-section h2{margin-top:1.1em}
.resources{page-break-before:always}.resources .chapter-banner{page-break-before:auto}
.resource-card{display:flex;align-items:stretch;gap:.22in;break-inside:avoid;margin:.62em 0;padding:.14in;background:#eef6fb;border:1px solid #cfe3f2;border-radius:9px;min-height:1.7in}
.site-shot{width:1.12in;height:1.48in;object-fit:cover;object-position:top;border-radius:5px;border:1px solid #b9d4e5;box-shadow:0 2px 5px #9fb3c466}
.resource-copy{flex:1;padding:.04in .08in 0 0}.resource-card h2{margin:0 0 .18em}.resource-card p{margin:0 0 .22em;font-size:10.5pt;line-height:1.35}
'''
Path=None
open(OUT,'w').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{content}</body></html>')
print(json.dumps({'pages':doc.page_count,'links':sum(len(p.get_links()) for p in doc),'html':OUT}))
