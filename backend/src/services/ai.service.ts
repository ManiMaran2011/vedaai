import OpenAI from 'openai';
import { v4 as uuid } from 'uuid';
import { config } from '../config/index.js';
import type {
  AssignmentInput, GeneratedPaper, GeneratedSection,
  GeneratedQuestion, QuestionType, Difficulty,
} from '../types.js';

const client = new OpenAI({
  apiKey: config.groqApiKey,
  baseURL: 'https://api.groq.com/openai/v1',
});

const TYPE_TITLES: Record<string, string> = {
  mcq:          'Multiple Choice Questions',
  short_answer: 'Short Answer Questions',
  long_answer:  'Long Answer Questions',
  true_false:   'True or False',
  fill_blank:   'Fill in the Blanks',
  diagram:      'Diagram / Graph Based Questions',
  numerical:    'Numerical Problems',
};

function buildPrompt(input: AssignmentInput): string {
  const configs = input.questionConfigs.filter(c => c.count > 0);
  const sections = configs.map(({ label, count, marksEach }, i) =>
    `Section ${String.fromCharCode(65 + i)}: ${count} × ${label} (${marksEach} mark${marksEach > 1 ? 's' : ''} each)`
  ).join('\n');

  return `You are an expert educator creating a formal examination paper.

EXAM DETAILS:
School: ${input.schoolName}
Teacher: ${input.teacherName}
Subject: ${input.subject}
Grade: ${input.grade}
Title: ${input.title}
Total Marks: ${input.totalMarks}
Duration: ${input.duration} minutes
Grading: ${input.gradingScale}
${input.instructions ? `Instructions: ${input.instructions}` : ''}
${input.fileContent ? `\nREFERENCE MATERIAL:\n${input.fileContent.slice(0, 3000)}` : ''}

SECTIONS:
${sections}

DIFFICULTY: Easy ${input.difficultyDistribution.easy}%, Medium ${input.difficultyDistribution.medium}%, Hard ${input.difficultyDistribution.hard}%

Return ONLY valid JSON — no markdown, no explanation:
{
  "sections": [
    {
      "label": "Section A",
      "title": "Multiple Choice Questions",
      "instruction": "Choose the best answer. Each question carries 1 mark.",
      "questions": [
        {
          "text": "Question text here?",
          "type": "mcq",
          "difficulty": "easy",
          "marks": 1,
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": "Option B"
        }
      ]
    }
  ]
}

RULES:
- type: mcq | short_answer | long_answer | true_false | fill_blank | diagram | numerical
- difficulty: easy | medium | hard
- mcq: exactly 4 options
- true_false: options ["True", "False"]
- others: no options field
- Every question must have an answer field
- Questions must be specific to "${input.subject}" for "${input.grade}" students
- If reference material provided, base questions on it
- Return ONLY the JSON`;
}

interface RawQ { text: string; type: string; difficulty: string; marks: number; options?: string[]; answer?: string; }
interface RawS { label: string; title: string; instruction: string; questions: RawQ[]; }
interface RawPaper { sections: RawS[]; }

function parsePaper(raw: RawPaper, input: AssignmentInput, assignmentId: string): GeneratedPaper {
  const sections: GeneratedSection[] = raw.sections.map((s, i) => {
    const questions: GeneratedQuestion[] = s.questions.map(q => ({
      id: uuid(),
      text: q.text,
      type: (q.type as QuestionType) || 'short_answer',
      difficulty: (['easy','medium','hard'].includes(q.difficulty) ? q.difficulty : 'medium') as Difficulty,
      marks: typeof q.marks === 'number' ? q.marks : 1,
      options: q.options,
      answer: q.answer,
    }));
    return {
      id: uuid(),
      label: s.label || `Section ${String.fromCharCode(65 + i)}`,
      title: s.title || TYPE_TITLES[input.questionConfigs[i]?.type || 'short_answer'],
      instruction: s.instruction || 'Attempt all questions.',
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
      questions,
    };
  });

  return {
    id: uuid(),
    assignmentId,
    schoolName: input.schoolName,
    teacherName: input.teacherName,
    title: input.title,
    subject: input.subject,
    grade: input.grade,
    duration: input.duration,
    totalMarks: sections.reduce((sum, s) => sum + s.totalMarks, 0),
    sections,
    generatedAt: new Date().toISOString(),
  };
}

export async function generatePaper(
  input: AssignmentInput,
  assignmentId: string,
  onProgress?: (p: number, msg: string) => void
): Promise<GeneratedPaper> {
  onProgress?.(10, 'Building prompt...');
  const prompt = buildPrompt(input);

  onProgress?.(20, `Sending to ${config.aiModel} on Groq...`);

  const completion = await client.chat.completions.create({
    model: config.aiModel,
    max_tokens: 4096,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an expert educator. Respond only with valid JSON.' },
      { role: 'user', content: prompt },
    ],
  });

  onProgress?.(70, 'Parsing AI response...');

  const raw = completion.choices[0]?.message?.content || '';
  const cleaned = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim();

  let parsed: RawPaper;
  try {
    parsed = JSON.parse(cleaned) as RawPaper;
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  if (!parsed.sections?.length) throw new Error('AI response missing sections');

  onProgress?.(90, 'Structuring paper...');
  const paper = parsePaper(parsed, input, assignmentId);
  onProgress?.(100, 'Complete!');
  return paper;
}
