'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  Upload, X, Plus, Minus, ChevronDown,
  ArrowLeft, ArrowRight, FileText, Loader2, Calendar
} from 'lucide-react';
import { assignmentApi } from '@/lib/api';
import { useStore } from '@/store';
import { useToast } from '@/components/ui/Toast';
import type { QuestionConfig, QuestionType } from '@/types';
import clsx from 'clsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'mcq',          label: 'Multiple Choice Questions' },
  { value: 'short_answer', label: 'Short Questions' },
  { value: 'long_answer',  label: 'Long Answer Questions' },
  { value: 'true_false',   label: 'True/False Questions' },
  { value: 'fill_blank',   label: 'Fill in the Blank' },
  { value: 'diagram',      label: 'Diagram/Graph-Based Questions' },
  { value: 'numerical',    label: 'Numerical Problems' },
];

const GRADES = [
  'Class 1','Class 2','Class 3','Class 4','Class 5',
  'Class 6','Class 7','Class 8','Class 9','Class 10',
  'Class 11','Class 12','Undergraduate','Postgraduate',
];

const GRADING_SCALES = ['Marks','Percentage','GPA (4.0)','GPA (10.0)','Letter Grade','Pass/Fail'];

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
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

// ─── File drop zone ───────────────────────────────────────────────────────────

function FileZone({ file, onFile, onClear }: { file: File | null; onFile: (f: File) => void; onClear: () => void }) {
  const onDrop = useCallback((files: File[]) => { if (files[0]) onFile(files[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'], 'image/*': ['.jpg', '.jpeg', '.png'] },
    maxFiles: 1, maxSize: 8 * 1024 * 1024,
  });

  if (file) return (
    <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-3 bg-gray-50">
      <FileText size={18} className="text-[#E8650A] flex-shrink-0" />
      <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
      <button onClick={onClear} className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded">
        <X size={15} />
      </button>
    </div>
  );

  return (
    <div {...getRootProps()}
      className={clsx(
        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
        isDragActive ? 'border-[#E8650A] bg-orange-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
      )}>
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-1">
          <Upload size={18} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700">Choose a file or drag & drop it here</p>
        <p className="text-xs text-gray-400">JPEG, PNG, upto 8MB</p>
        <button type="button"
          className="mt-2 px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-colors bg-white">
          Browse Files
        </button>
      </div>
    </div>
  );
}

// ─── Number stepper ───────────────────────────────────────────────────────────

function Stepper({ value, onChange, min = 0, max = 50 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600">
        <Minus size={11} />
      </button>
      <span className="w-7 text-center text-sm font-semibold text-gray-800 tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
        className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600">
        <Plus size={11} />
      </button>
    </div>
  );
}

// ─── Question type row ────────────────────────────────────────────────────────

function QuestionRow({ config, usedTypes, onChange, onRemove }: {
  config: QuestionConfig;
  usedTypes: QuestionType[];
  onChange: (c: QuestionConfig) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 animate-fade-up">
      <div className="flex-1 relative">
        <select value={config.type}
          onChange={e => {
            const found = QUESTION_TYPES.find(t => t.value === e.target.value);
            onChange({ ...config, type: e.target.value as QuestionType, label: found?.label || config.label });
          }}
          className="select text-sm py-2">
          {QUESTION_TYPES.map(t => (
            <option key={t.value} value={t.value}
              disabled={usedTypes.includes(t.value) && t.value !== config.type}>
              {t.label}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      <button type="button" onClick={onRemove}
        className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0">
        <X size={14} />
      </button>

      <Stepper value={config.count} onChange={v => onChange({ ...config, count: v })} />
      <Stepper value={config.marksEach} onChange={v => onChange({ ...config, marksEach: v })} min={1} max={100} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewAssignmentPage() {
  const router = useRouter();
  const { addAssignment, profile } = useStore();
  const { add: toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormState>({
    title: '',
    subject: '',
    grade: 'Class 10',
    schoolName: profile.schoolName,
    teacherName: profile.name,
    dueDate: '',
    duration: 60,
    totalMarks: 60,
    gradingScale: 'Marks',
    instructions: '',
    questionConfigs: [
      { type: 'mcq',          label: 'Multiple Choice Questions',      count: 4, marksEach: 1 },
      { type: 'short_answer', label: 'Short Questions',                count: 3, marksEach: 2 },
      { type: 'diagram',      label: 'Diagram/Graph-Based Questions',  count: 5, marksEach: 5 },
      { type: 'numerical',    label: 'Numerical Problems',             count: 5, marksEach: 5 },
    ],
    difficultyDistribution: { easy: 40, medium: 40, hard: 20 },
  });

  const upd = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  const updateConfig = (i: number, c: QuestionConfig) =>
    upd('questionConfigs', form.questionConfigs.map((x, idx) => idx === i ? c : x));

  const addConfig = () => {
    const used = form.questionConfigs.map(c => c.type);
    const next = QUESTION_TYPES.find(t => !used.includes(t.value));
    if (next) upd('questionConfigs', [...form.questionConfigs, { type: next.value, label: next.label, count: 3, marksEach: 2 }]);
  };

  const totalQ = form.questionConfigs.reduce((s, c) => s + c.count, 0);
  const totalM = form.questionConfigs.reduce((s, c) => s + c.count * c.marksEach, 0);
  const usedTypes = form.questionConfigs.map(c => c.type);
  const diffTotal = form.difficultyDistribution.easy + form.difficultyDistribution.medium + form.difficultyDistribution.hard;

  function validate(forStep: number): boolean {
    const e: Record<string, string> = {};
    if (forStep >= 1 && !form.dueDate) e.dueDate = 'Required';
    if (forStep >= 1 && form.questionConfigs.every(c => c.count === 0)) e.configs = 'Add at least one question';
    if (forStep >= 2 && !form.title.trim()) e.title = 'Required';
    if (forStep >= 2 && !form.subject.trim()) e.subject = 'Required';
    if (forStep >= 2 && !form.schoolName.trim()) e.schoolName = 'Required';
    if (forStep >= 2 && !form.teacherName.trim()) e.teacherName = 'Required';
    if (forStep >= 2 && Math.abs(diffTotal - 100) > 5) e.difficulty = 'Must sum to 100%';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goToStep2() {
    if (validate(1)) setStep(2);
  }

  async function handleSubmit() {
    if (!validate(2)) return;
    setSubmitting(true);
    try {
      const assignment = await assignmentApi.create({ ...form, file: file || undefined });
      addAssignment(assignment);
      toast('success', 'Assignment created! Generating paper...');
      router.push(`/assignments/${assignment.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create assignment';
      toast('error', msg);
      setErrors({ submit: 'Failed to create. Is the backend running on port 4000?' });
      setSubmitting(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          <h1 className="text-sm font-semibold text-gray-900">Create Assignment</h1>
        </div>
        <p className="text-xs text-gray-400">Set up a new assignment for your students.</p>

        {/* Step progress bar */}
        <div className="flex gap-2 mt-4">
          <div className={clsx('h-1 flex-1 rounded-full transition-all duration-300', step >= 1 ? 'bg-gray-900' : 'bg-gray-200')} />
          <div className={clsx('h-1 flex-1 rounded-full transition-all duration-300', step >= 2 ? 'bg-gray-900' : 'bg-gray-200')} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-5 space-y-4">

        {/* ═══ STEP 1: Upload + Questions ═══════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-up">
            <div className="section-card">
              <h2 className="text-sm font-semibold text-gray-800 mb-0.5">Assignment Details</h2>
              <p className="text-xs text-gray-400 mb-4">Basic information about your assignment</p>

              <FileZone file={file} onFile={setFile} onClear={() => setFile(null)} />
              <p className="text-[11px] text-gray-400 text-center mt-2">
                Upload images of your preferred document/image
              </p>

              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Due Date</label>
                <div className="relative">
                  <input type="date" className="input pr-10 text-sm"
                    value={form.dueDate} onChange={e => upd('dueDate', e.target.value)} />
                  <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
              </div>
            </div>

            {/* Question types */}
            <div className="section-card">
              <div className="flex items-center gap-4 text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
                <span className="flex-1">Question Type</span>
                <span className="w-24 text-center">No. of Questions</span>
                <span className="w-16 text-center">Marks</span>
              </div>

              {form.questionConfigs.map((c, i) => (
                <QuestionRow key={i} config={c} usedTypes={usedTypes}
                  onChange={c => updateConfig(i, c)}
                  onRemove={() => upd('questionConfigs', form.questionConfigs.filter((_, idx) => idx !== i))} />
              ))}

              {errors.configs && <p className="text-xs text-red-500 mt-2">{errors.configs}</p>}

              {form.questionConfigs.length < QUESTION_TYPES.length && (
                <button type="button" onClick={addConfig}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mt-3 transition-colors">
                  <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
                    <Plus size={11} className="text-white" />
                  </div>
                  Add Question Type
                </button>
              )}

              <div className="mt-4 pt-3 border-t border-gray-100 text-right space-y-0.5">
                <p className="text-xs text-gray-500">
                  Total Questions : <strong className="text-gray-800">{totalQ}</strong>
                </p>
                <p className="text-xs text-gray-500">
                  Total Marks : <strong className={totalM !== form.totalMarks ? 'text-amber-600' : 'text-gray-800'}>{totalM}</strong>
                </p>
              </div>
            </div>

            {/* Additional info */}
            <div className="section-card">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Additional Information
                <span className="text-gray-400 font-normal ml-1">(For better output)</span>
              </label>
              <textarea className="input min-h-[80px] resize-none text-sm"
                placeholder="e.g. Generate a question paper for 3 hour exam duration, focus on chapters 4-6..."
                value={form.instructions}
                onChange={e => upd('instructions', e.target.value)} />
            </div>

            <div className="flex justify-between pt-1">
              <button type="button" onClick={() => router.back()} className="btn-secondary">
                <ArrowLeft size={14} /> Previous
              </button>
              <button type="button" onClick={goToStep2} className="btn-primary">
                Next <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Assignment details ════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-up">
            {/* Core details */}
            <div className="section-card space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-0.5">Assignment Details</h2>
                <p className="text-xs text-gray-400">Basic information about your assignment</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Assignment Title *</label>
                  <input className="input text-sm" placeholder="e.g. Quiz on Electricity"
                    value={form.title} onChange={e => upd('title', e.target.value)} />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Subject *</label>
                  <input className="input text-sm" placeholder="e.g. Physics, Mathematics"
                    value={form.subject} onChange={e => upd('subject', e.target.value)} />
                  {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">School Name *</label>
                  <input className="input text-sm" placeholder="e.g. Springfield High School"
                    value={form.schoolName} onChange={e => upd('schoolName', e.target.value)} />
                  {errors.schoolName && <p className="text-xs text-red-500 mt-1">{errors.schoolName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Teacher Name *</label>
                  <input className="input text-sm" placeholder="e.g. Mr. John Smith"
                    value={form.teacherName} onChange={e => upd('teacherName', e.target.value)} />
                  {errors.teacherName && <p className="text-xs text-red-500 mt-1">{errors.teacherName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Class / Grade</label>
                  <div className="relative">
                    <select className="select text-sm" value={form.grade}
                      onChange={e => upd('grade', e.target.value)}>
                      {GRADES.map(g => <option key={g}>{g}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Duration (min)</label>
                  <input type="number" className="input text-sm" min={5} max={480}
                    value={form.duration} onChange={e => upd('duration', Math.max(5, +e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Total Marks</label>
                  <input type="number" className="input text-sm" min={1}
                    value={form.totalMarks} onChange={e => upd('totalMarks', Math.max(1, +e.target.value))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Grading Scale</label>
                <div className="relative max-w-xs">
                  <select className="select text-sm" value={form.gradingScale}
                    onChange={e => upd('gradingScale', e.target.value)}>
                    {GRADING_SCALES.map(g => <option key={g}>{g}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Question summary */}
            <div className="section-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Questions Summary</h3>
                <button type="button" onClick={() => setStep(1)}
                  className="text-xs text-[#E8650A] hover:underline">Edit</button>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 pb-2 border-b border-gray-100">
                <span className="flex-1">Question Type</span>
                <span className="w-24 text-center">No. of Questions</span>
                <span className="w-16 text-center">Marks</span>
              </div>
              {form.questionConfigs.filter(c => c.count > 0).map((c, i) => (
                <QuestionRow key={i} config={c} usedTypes={usedTypes}
                  onChange={c => updateConfig(form.questionConfigs.indexOf(c), c)}
                  onRemove={() => upd('questionConfigs', form.questionConfigs.filter((_, idx) => idx !== form.questionConfigs.indexOf(c)))} />
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100 text-right space-y-0.5">
                <p className="text-xs text-gray-500">Total Questions : <strong className="text-gray-800">{totalQ}</strong></p>
                <p className="text-xs text-gray-500">Total Marks : <strong className="text-gray-800">{totalM}</strong></p>
              </div>
            </div>

            {/* Difficulty distribution */}
            <div className="section-card">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Difficulty Distribution</h3>
              <div className="space-y-4">
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <div key={d} className="flex items-center gap-3">
                    <span className={clsx('text-xs font-semibold w-12 capitalize',
                      d === 'easy' ? 'text-green-600' : d === 'medium' ? 'text-amber-600' : 'text-red-500')}>
                      {d}
                    </span>
                    <input type="range" min={0} max={100} step={5}
                      value={form.difficultyDistribution[d]}
                      onChange={e => upd('difficultyDistribution', { ...form.difficultyDistribution, [d]: +e.target.value })}
                      className="flex-1 accent-gray-800" />
                    <span className="text-xs font-semibold text-gray-700 w-8 text-right tabular-nums">
                      {form.difficultyDistribution[d]}%
                    </span>
                  </div>
                ))}
                <div className={clsx('text-xs font-medium text-right',
                  Math.abs(diffTotal - 100) > 5 ? 'text-red-500' : 'text-green-600')}>
                  Total: {diffTotal}% {Math.abs(diffTotal - 100) <= 5 ? '✓' : '— adjust to reach 100%'}
                </div>
                {errors.difficulty && <p className="text-xs text-red-500">{errors.difficulty}</p>}
              </div>
            </div>

            {/* Additional info */}
            <div className="section-card">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Additional Information
                <span className="text-gray-400 font-normal ml-1">(For better AI output)</span>
              </label>
              <textarea className="input min-h-[72px] resize-none text-sm"
                placeholder="Specific topics, chapters, learning objectives, or exam instructions..."
                value={form.instructions}
                onChange={e => upd('instructions', e.target.value)} />
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {errors.submit}
              </div>
            )}

            <div className="flex justify-between pt-1">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                <ArrowLeft size={14} /> Previous
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary px-8">
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> Creating...</>
                  : <>Next <ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
