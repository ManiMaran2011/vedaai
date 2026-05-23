import type { GeneratedPaper, GeneratedQuestion } from '../types.js';

function diffColor(d: string): string {
  if (d === 'easy') return '#16a34a';
  if (d === 'hard') return '#dc2626';
  return '#d97706';
}

function diffBg(d: string): string {
  if (d === 'easy') return '#f0fdf4';
  if (d === 'hard') return '#fef2f2';
  return '#fffbeb';
}

function renderQuestion(q: GeneratedQuestion, index: number): string {
  const options = q.options
    ? `<ol class="options">${q.options.map((o, i) =>
        `<li><span class="opt-label">${String.fromCharCode(97 + i)})</span> ${o}</li>`
      ).join('')}</ol>`
    : q.type === 'long_answer'
      ? `<div class="lines">${'<div class="line"></div>'.repeat(5)}</div>`
      : q.type === 'diagram'
        ? `<div class="diagram-box">Draw / attach diagram here</div>`
        : `<div class="lines">${'<div class="line"></div>'.repeat(2)}</div>`;

  return `
    <div class="question">
      <div class="question-header">
        <span class="question-num">${index}.</span>
        <span class="question-text">${q.text}</span>
        <span class="question-meta">
          <span class="diff-badge" style="color:${diffColor(q.difficulty)};background:${diffBg(q.difficulty)}">${q.difficulty}</span>
          <span class="marks">[${q.marks} ${q.marks === 1 ? 'Mark' : 'Marks'}]</span>
        </span>
      </div>
      ${options}
    </div>`;
}

function buildHTML(paper: GeneratedPaper): string {
  const sections = paper.sections.map(section => `
    <div class="section">
      <div class="section-header">
        <div class="section-label-row">
          <span class="section-label">${section.label}</span>
          <span class="section-marks">[${section.totalMarks} Marks]</span>
        </div>
        <div class="section-title">${section.title}</div>
        <div class="section-instruction">${section.instruction}</div>
      </div>
      <div class="questions">
        ${section.questions.map((q, i) => renderQuestion(q, i + 1)).join('')}
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #111;
    background: white;
  }

  .paper {
    max-width: 210mm;
    margin: 0 auto;
    padding: 20mm 18mm;
  }

  .header {
    text-align: center;
    border-bottom: 2px solid #111;
    padding-bottom: 12px;
    margin-bottom: 14px;
  }

  .school-name {
    font-size: 16pt;
    font-weight: bold;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .subject-line {
    font-size: 11pt;
    margin-top: 4px;
    color: #333;
  }

  .exam-title {
    font-size: 13pt;
    font-weight: bold;
    margin-top: 4px;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 10pt;
    margin-top: 8px;
    color: #444;
  }

  .general-instruction {
    font-style: italic;
    font-size: 9.5pt;
    color: #555;
    background: #f9f9f9;
    padding: 6px 10px;
    border-left: 3px solid #ccc;
    margin-bottom: 12px;
  }

  .student-info {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    margin-bottom: 16px;
    padding: 10px 0;
    border-bottom: 1px solid #ddd;
  }

  .info-field label {
    font-size: 9pt;
    color: #666;
    display: block;
    margin-bottom: 4px;
  }

  .info-field .field-line {
    border-bottom: 1px solid #444;
    height: 20px;
  }

  .section {
    margin-bottom: 20px;
    page-break-inside: avoid;
  }

  .section-header {
    background: #f4f4f4;
    border-left: 4px solid #333;
    padding: 8px 12px;
    margin-bottom: 10px;
  }

  .section-label-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .section-label {
    font-size: 12pt;
    font-weight: bold;
    text-transform: uppercase;
  }

  .section-marks {
    font-size: 10pt;
    color: #555;
  }

  .section-title {
    font-size: 10.5pt;
    font-weight: bold;
    margin-top: 2px;
  }

  .section-instruction {
    font-size: 9.5pt;
    font-style: italic;
    color: #666;
    margin-top: 2px;
  }

  .question {
    margin-bottom: 14px;
    page-break-inside: avoid;
  }

  .question-header {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .question-num {
    font-weight: bold;
    flex-shrink: 0;
    min-width: 20px;
    font-size: 10.5pt;
  }

  .question-text {
    flex: 1;
    font-size: 10.5pt;
    line-height: 1.5;
  }

  .question-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    margin-left: 8px;
  }

  .diff-badge {
    font-size: 7.5pt;
    font-family: Arial, sans-serif;
    font-weight: bold;
    padding: 1px 6px;
    border-radius: 10px;
    text-transform: capitalize;
  }

  .marks {
    font-size: 9pt;
    color: #555;
    white-space: nowrap;
    font-family: Arial, sans-serif;
  }

  .options {
    list-style: none;
    margin: 8px 0 0 28px;
  }

  .options li {
    font-size: 10pt;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .opt-label {
    font-weight: bold;
    min-width: 18px;
  }

  .lines {
    margin: 8px 0 0 28px;
  }

  .line {
    border-bottom: 1px solid #bbb;
    height: 22px;
    margin-bottom: 4px;
  }

  .diagram-box {
    margin: 8px 0 0 28px;
    border: 1px dashed #aaa;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9pt;
    color: #999;
    font-style: italic;
  }

  .footer {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
    color: #777;
  }
</style>
</head>
<body>
<div class="paper">

  <div class="header">
    <div class="school-name">${paper.schoolName}</div>
    <div class="subject-line">Subject: ${paper.subject} &nbsp;|&nbsp; Class: ${paper.grade}</div>
    <div class="exam-title">${paper.title}</div>
    <div class="meta-row">
      <span>Time Allowed: <strong>${paper.duration} minutes</strong></span>
      <span>Maximum Marks: <strong>${paper.totalMarks}</strong></span>
    </div>
  </div>

  <div class="general-instruction">
    All questions are compulsory unless stated otherwise. Read each question carefully before answering.
  </div>

  <div class="student-info">
    <div class="info-field"><label>Name:</label><div class="field-line"></div></div>
    <div class="info-field"><label>Roll Number:</label><div class="field-line"></div></div>
    <div class="info-field"><label>Class / Section:</label><div class="field-line"></div></div>
  </div>

  ${sections}

  <div class="footer">
    <span>${paper.schoolName} &middot; ${paper.subject} &middot; ${paper.grade}</span>
    <span>Prepared by: ${paper.teacherName}</span>
  </div>

</div>
</body>
</html>`;
}

export async function generatePDF(paper: GeneratedPaper): Promise<Buffer> {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildHTML(paper), { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
