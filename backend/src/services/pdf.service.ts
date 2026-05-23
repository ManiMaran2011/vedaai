import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { GeneratedPaper } from '../types.js';

const BRAND = rgb(0.2, 0.2, 0.2);
const GRAY  = rgb(0.4, 0.4, 0.4);
const LIGHT = rgb(0.96, 0.96, 0.96);
const BLACK = rgb(0, 0, 0);

function diffColor(d: string) {
  if (d === 'easy')   return rgb(0.09, 0.64, 0.26);
  if (d === 'hard')   return rgb(0.86, 0.15, 0.15);
  return rgb(0.85, 0.47, 0.03);
}

export async function generatePDF(paper: GeneratedPaper): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await doc.embedFont(StandardFonts.Helvetica);
  const it   = await doc.embedFont(StandardFonts.HelveticaOblique);

  const W = 595, H = 842;
  const ML = 50, MR = 50, MT = 50;
  let page = doc.addPage([W, H]);
  let y = H - MT;

  function newPage() {
    page = doc.addPage([W, H]);
    y = H - MT;
  }

  function checkSpace(needed: number) {
    if (y - needed < 50) newPage();
  }

  function drawText(text: string, x: number, size: number, font: typeof bold, color = BLACK, maxWidth?: number) {
    const usable = maxWidth ?? (W - ML - MR);
    // Word wrap
    const words = text.split(' ');
    let line = '';
    const lines: string[] = [];
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > usable && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    for (const l of lines) {
      checkSpace(size + 4);
      page.drawText(l, { x, y, size, font, color });
      y -= size + 4;
    }
    return lines.length;
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  const schoolW = bold.widthOfTextAtSize(paper.schoolName.toUpperCase(), 16);
  page.drawText(paper.schoolName.toUpperCase(), {
    x: (W - schoolW) / 2, y, size: 16, font: bold, color: BLACK,
  });
  y -= 22;

  const subLine = `Subject: ${paper.subject}  |  Class: ${paper.grade}`;
  const subW = reg.widthOfTextAtSize(subLine, 11);
  page.drawText(subLine, { x: (W - subW) / 2, y, size: 11, font: reg, color: GRAY });
  y -= 16;

  const titleW = bold.widthOfTextAtSize(paper.title, 13);
  page.drawText(paper.title, { x: (W - titleW) / 2, y, size: 13, font: bold, color: BLACK });
  y -= 18;

  // divider
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 1.5, color: BLACK });
  y -= 12;

  // time + marks row
  page.drawText(`Time Allowed: ${paper.duration} minutes`, { x: ML, y, size: 10, font: reg, color: GRAY });
  const mText = `Maximum Marks: ${paper.totalMarks}`;
  const mW = reg.widthOfTextAtSize(mText, 10);
  page.drawText(mText, { x: W - MR - mW, y, size: 10, font: reg, color: GRAY });
  y -= 20;

  // instruction box
  page.drawRectangle({ x: ML, y: y - 18, width: W - ML - MR, height: 22, color: LIGHT });
  page.drawText('All questions are compulsory unless stated otherwise.', {
    x: ML + 6, y: y - 12, size: 9, font: it, color: GRAY,
  });
  y -= 30;

  // student info
  const fieldW = (W - ML - MR - 20) / 3;
  ['Name:', 'Roll Number:', 'Class / Section:'].forEach((label, i) => {
    const fx = ML + i * (fieldW + 10);
    page.drawText(label, { x: fx, y, size: 9, font: reg, color: GRAY });
    page.drawLine({ start: { x: fx, y: y - 14 }, end: { x: fx + fieldW, y: y - 14 }, thickness: 0.8, color: GRAY });
  });
  y -= 30;

  // ── Sections ────────────────────────────────────────────────────────────────
  for (const section of paper.sections) {
    checkSpace(60);

    // Section header bar
    page.drawRectangle({ x: ML, y: y - 36, width: W - ML - MR, height: 40, color: LIGHT });
    page.drawRectangle({ x: ML, y: y - 36, width: 4, height: 40, color: BRAND });
    page.drawText(section.label.toUpperCase(), { x: ML + 12, y: y - 12, size: 12, font: bold, color: BLACK });
    const mks = `[${section.totalMarks} Marks]`;
    const mksW = reg.widthOfTextAtSize(mks, 10);
    page.drawText(mks, { x: W - MR - mksW, y: y - 12, size: 10, font: reg, color: GRAY });
    page.drawText(section.title, { x: ML + 12, y: y - 24, size: 10, font: bold, color: BRAND });
    y -= 44;

    page.drawText(section.instruction, { x: ML, y, size: 9, font: it, color: GRAY });
    y -= 16;

    // Questions
    for (let qi = 0; qi < section.questions.length; qi++) {
      const q = section.questions[qi];
      checkSpace(40);

      // Question number
      page.drawText(`${qi + 1}.`, { x: ML, y, size: 10, font: bold, color: BLACK });

      // Marks badge
      const mLabel = `[${q.marks}M]`;
      const mLW = reg.widthOfTextAtSize(mLabel, 8);
      page.drawText(mLabel, { x: W - MR - mLW, y, size: 8, font: reg, color: GRAY });

      // Difficulty badge
      const dLabel = q.difficulty;
      const dLW = reg.widthOfTextAtSize(dLabel, 8);
      const dX = W - MR - mLW - dLW - 10;
      page.drawText(dLabel, { x: dX, y, size: 8, font: bold, color: diffColor(q.difficulty) });

      // Question text
      const qX = ML + 18;
      const qMaxW = W - ML - MR - 18 - mLW - dLW - 20;
      const words = q.text.split(' ');
      let line = '';
      const lines: string[] = [];
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (reg.widthOfTextAtSize(test, 10) > qMaxW && line) { lines.push(line); line = w; }
        else line = test;
      }
      if (line) lines.push(line);

      for (let li = 0; li < lines.length; li++) {
        if (li > 0) { checkSpace(14); }
        page.drawText(lines[li], { x: qX, y, size: 10, font: reg, color: BLACK });
        y -= 14;
      }

      // Options
      if (q.options) {
        for (let oi = 0; oi < q.options.length; oi++) {
          checkSpace(14);
          const optLabel = String.fromCharCode(97 + oi) + ')';
          page.drawText(optLabel, { x: qX + 10, y, size: 9, font: bold, color: GRAY });
          page.drawText(q.options[oi], { x: qX + 28, y, size: 9, font: reg, color: BLACK });
          y -= 13;
        }
      } else {
        // Answer lines
        const lineCount = q.type === 'long_answer' ? 4 : 2;
        for (let li = 0; li < lineCount; li++) {
          checkSpace(18);
          page.drawLine({ start: { x: qX, y: y - 8 }, end: { x: W - MR, y: y - 8 }, thickness: 0.5, color: rgb(0.7,0.7,0.7) });
          y -= 18;
        }
      }

      y -= 6;
    }
    y -= 10;
  }

  // Footer
  checkSpace(20);
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.5, color: rgb(0.8,0.8,0.8) });
  y -= 12;
  page.drawText(`${paper.schoolName} · ${paper.subject} · ${paper.grade}`, { x: ML, y, size: 8, font: reg, color: GRAY });
  const prepText = `Prepared by: ${paper.teacherName}`;
  const prepW = reg.widthOfTextAtSize(prepText, 8);
  page.drawText(prepText, { x: W - MR - prepW, y, size: 8, font: reg, color: GRAY });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
