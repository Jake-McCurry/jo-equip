import pymupdf as fitz
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
test_pdf = ROOT / ".agents/outputs/adventure-visual-proof-v3.pdf"

subprocess.run(["pdftotext", "-layout", str(test_pdf), str(ROOT / ".agents/outputs/adventure-layout-review/v3_text.txt")])
