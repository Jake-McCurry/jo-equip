import sys
sys.path.insert(0, '/tmp/pymupdf-inspect')
import fitz
from pathlib import Path
src = Path('attached_assets/The_Adventure_of_Living_with_Jesus_1788371751778.pdf')
out = Path('/tmp/adventure-pdf-inspection')
doc = fitz.open(src)
for n in [0,1,2,3,4,8,12,18,24,30,35]:
    page = doc[n]
    pix = page.get_pixmap(matrix=fitz.Matrix(1.35, 1.35), alpha=False)
    pix.save(out / f'page-{n+1:02}.png')
print({'pages': doc.page_count, 'links': sum(len(p.get_links()) for p in doc), 'rendered': 11})
