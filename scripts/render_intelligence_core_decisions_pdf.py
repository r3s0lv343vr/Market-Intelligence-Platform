#!/usr/bin/env python3
"""Render docs/INTELLIGENCE_CORE_DECISIONS.md to a printable PDF."""

from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
MD = ROOT / "docs" / "INTELLIGENCE_CORE_DECISIONS.md"
PDF = ROOT / "docs" / "INTELLIGENCE_CORE_DECISIONS.pdf"


class Doc(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "", 8)
        self.set_text_color(90, 90, 90)
        self.cell(0, 8, "Trace Market Intelligence  |  Intelligence Core Decisions  |  Not approved for build", align="C")
        self.ln(4)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(90, 90, 90)
        self.cell(0, 8, f"{self.page_no()}", align="C")


def strip_md(text: str) -> str:
    text = text.replace("**", "")
    text = text.replace("`", "")
    text = text.replace("→", "->")
    text = text.replace("×", "x")
    text = text.replace("—", "-")
    text = text.replace("–", "-")
    text = text.replace("“", '"').replace("”", '"')
    text = text.replace("‘", "'").replace("’", "'")
    return text


def latin(text: str) -> str:
    text = strip_md(text)
    return text.encode("latin-1", "replace").decode("latin-1")


def main() -> None:
    lines = MD.read_text(encoding="utf-8").splitlines()
    pdf = Doc(format="Letter")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_left_margin(18)
    pdf.set_right_margin(18)
    pdf.set_top_margin(16)

    in_code = False
    for raw in lines:
        line = raw.rstrip()
        if line.startswith("```"):
            in_code = not in_code
            continue
        if line.startswith("| ---") or set(line.replace("|", "").replace(" ", "").replace("-", "")) == set():
            continue

        text = latin(line)
        pdf.set_x(pdf.l_margin)

        if in_code:
            pdf.set_font("Courier", "", 8)
            pdf.set_text_color(20, 20, 20)
            pdf.multi_cell(pdf.epw, 4.5, text if text else " ")
            continue

        if not text:
            pdf.ln(2.5)
            continue

        if text.startswith("# "):
            pdf.set_font("Helvetica", "B", 16)
            pdf.set_text_color(20, 20, 20)
            pdf.multi_cell(pdf.epw, 8, text[2:])
            pdf.ln(2)
        elif text.startswith("## "):
            pdf.ln(2)
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(20, 20, 20)
            pdf.multi_cell(pdf.epw, 7, text[3:])
            pdf.ln(1)
        elif text.startswith("| "):
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(40, 40, 40)
            cells = [c.strip() for c in text.strip("|").split("|")]
            pdf.multi_cell(pdf.epw, 5, " / ".join(cells))
        elif text.startswith("- "):
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(30, 30, 30)
            pdf.multi_cell(pdf.epw, 5.2, "- " + text[2:])
        else:
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(30, 30, 30)
            pdf.multi_cell(pdf.epw, 5.2, text)

    pdf.output(PDF)
    print(PDF)


if __name__ == "__main__":
    main()
