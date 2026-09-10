import subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
test_pdf = ROOT / ".agents/outputs/adventure-visual-proof-v4.pdf"
subprocess.run(["pdftotext", "-layout", str(test_pdf), str(ROOT / ".agents/outputs/adventure-layout-review/v4_text.txt")])
