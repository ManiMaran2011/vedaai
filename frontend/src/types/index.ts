export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'mcq' | 'short_answer' | 'long_answer' | 'true_false' | 'fill_blank' | 'diagram' | 'numerical';
export type JobStatus = 'pending' | 'processing' | 'complete' | 'failed';

export interface QuestionConfig {
  type: QuestionType;
  label: string;
  count: number;
  marksEach: number;
}

export interface AssignmentInput {
  title: string;
  subject: string;
  grade: string;
  schoolName: string;
  teacherName: string;
  dueDate: string;
  duration: number;
  totalMarks: number;
  gradingScale: string;
  instructions: string;
  questionConfigs: QuestionConfig[];
  difficultyDistribution: { easy: number; medium: number; hard: number };
}

export interface GeneratedQuestion {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  options?: string[];
  answer?: string;
}

export interface GeneratedSection {
  id: string;
  label: string;
  title: string;
  instruction: string;
  totalMarks: number;
  questions: GeneratedQuestion[];
}

export interface GeneratedPaper {
  id: string;
  assignmentId: string;
  schoolName: string;
  teacherName: string;
  title: string;
  subject: string;
  grade: string;
  duration: number;
  totalMarks: number;
  sections: GeneratedSection[];
  generatedAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  schoolName: string;
  teacherName: string;
  dueDate: string;
  assignedOn: string;
  status: JobStatus;
  hasPaper?: boolean;
  input: AssignmentInput;
  paper?: GeneratedPaper;
  error?: string;
  createdAt: string;
}

export interface TeacherProfile {
  name: string;
  schoolName: string;
  schoolLocation: string;
  subject: string;
  avatarInitials: string;
}

export type WsMessage =
  | { type: 'connected' }
  | { type: 'job:progress'; assignmentId: string; progress: number; message: string }
  | { type: 'job:complete'; assignmentId: string; paper: GeneratedPaper }
  | { type: 'job:failed'; assignmentId: string; error: string };
