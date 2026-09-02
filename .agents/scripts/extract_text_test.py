import pymupdf as fitz
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
test_pdf = ROOT / ".agents/outputs/adventure-layout-review/test_p12_v3.pdf"

# We can just use pdftotext to see exactly what gets extracted
subprocess.run(["pdftotext", "-layout", str(test_pdf), str(ROOT / ".agents/outputs/adventure-layout-review/test_p12_v3.txt")])
with open(ROOT / ".agents/outputs/adventure-layout-review/test_p12_v3.txt") as f:
    print(f.read())
