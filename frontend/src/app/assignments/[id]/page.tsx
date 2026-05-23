'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, RefreshCw, Printer, Sparkles,
  XCircle, Eye, EyeOff
} from 'lucide-react';
import { assignmentApi } from '@/lib/api';
import { useStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/components/ui/Toast';
import { format } from 'date-fns';
import type { GeneratedPaper, GeneratedQuestion } from '@/types';
import clsx from 'clsx';

function DiffBadge({ d }: { d: GeneratedQuestion['difficulty'] }) {
  return <span className={`badge-${d}`}>{d}</span>;
}

function QuestionItem({ q, index, showAnswer }: {
  q: GeneratedQuestion; index: number; showAnswer: boolean;
}) {
  return (
    <div className="mb-5 animate-fade-up">
      <div className="flex items-start gap-2">
        <span className="text-sm font-semibold text-gray-700 flex-shrink-0 mt-0.5 w-5">{index}.</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-gray-800 leading-relaxed flex-1">{q.text}</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <DiffBadge d={q.difficulty} />
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                [{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}]
              </span>
            </div>
          </div>
          {q.options && (
            <ol className="mt-2.5 space-y-1.5 ml-0">
              {q.options.map((opt, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-5 h-5 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-400 flex-shrink-0 font-medium bg-gray-50">
                    {String.fromCharCode(97 + i)}
                  </span>
                  <span>{opt}</span>
                </li>
              ))}
            </ol>
          )}
          {!q.options && (q.type === 'short_answer' || q.type === 'fill_blank') && (
            <div className="mt-2.5 space-y-2">
              <div className="border-b border-gray-300 h-5" />
              <div className="border-b border-gray-300 h-5" />
            </div>
          )}
          {!q.options && q.type === 'long_answer' && (
            <div className="mt-2.5 space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="border-b border-gray-300 h-6" />)}
            </div>
          )}
          {!q.options && q.type === 'numerical' && (
            <div className="mt-2.5 space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="border-b border-gray-300 h-6" />)}
            </div>
          )}
          {!q.options && q.type === 'diagram' && (
            <div className="mt-2.5 border border-dashed border-gray-300 rounded-lg h-28 flex items-center justify-center">
              <span className="text-xs text-gray-400">Draw / attach diagram here</span>
            </div>
          )}
          {showAnswer && q.answer && (
            <div className="mt-2 bg-green-50 border-l-2 border-green-400 rounded-r-lg px-3 py-2">
              <p className="text-xs text-green-700">
                <span className="font-semibold">Answer: </span>{q.answer}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GeneratingView({ message, progress }: { message?: string; progress?: number }) {
  const steps = [
    'Building exam prompt...',
    'Sending to Llama 3.3 on Groq...',
    'Processing AI response...',
    'Structuring question paper...',
    'Question paper ready!',
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-5 shadow-sm">
        <Sparkles size={24} className="text-[#E8650A]" />
      </div>
      <h2 className="text-base font-semibold text-gray-800 mb-1.5">
        Generating your question paper
      </h2>
      <p className="text-sm text-gray-500 mb-8 max-w-sm">
        {message || 'AI is crafting high-quality questions tailored to your requirements...'}
      </p>
      <div className="w-full max-w-sm">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-[#E8650A] rounded-full progress-stripe transition-all duration-700 animate-pulse"
            style={{ width: typeof progress === 'number' ? `${progress}%` : '30%' }} />
        </div>
        <div className="space-y-2 text-left">
          {steps.map((s, i) => {
            const pct = (i + 1) * 20;
            const done = (progress || 0) >= pct;
            const active = (progress || 0) >= pct - 20 && (progress || 0) < pct;
            return (
              <div key={i} className={clsx('flex items-center gap-2.5 text-xs transition-all',
                done ? 'text-green-600' : active ? 'text-[#E8650A]' : 'text-gray-300')}>
                <div className={clsx('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold',
                  done ? 'bg-green-400' : active ? 'bg-[#E8650A]' : 'bg-gray-200')}>
                  {done ? '✓' : i + 1}
                </div>
                {s}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PaperView({ paper, assignmentId }: { paper: GeneratedPaper; assignmentId: string }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { updateStatus } = useStore();
  const { add: toast } = useToast();

  const allQ = paper.sections.flatMap(s => s.questions);
  const diffBreakdown = allQ.reduce((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await assignmentApi.regenerate(assignmentId);
      updateStatus(assignmentId, 'pending');
      toast('info', 'Regeneration started...');
    } catch {
      toast('error', 'Failed to start regeneration');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-[#1C1C1C] px-5 py-3 flex items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles size={14} className="text-[#E8650A] flex-shrink-0" />
          <p className="text-xs text-gray-300 truncate">
            AI-generated question paper for <strong className="text-white">{paper.subject}</strong> · {paper.grade} · {paper.schoolName}
          </p>
        </div>
        <button onClick={() => setShowAnswer(s => !s)}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-lg px-3 py-1.5 text-xs text-white font-medium flex-shrink-0">
          {showAnswer ? <EyeOff size={12} /> : <Eye size={12} />}
          {showAnswer ? 'Hide' : 'Show'} Answer Key
        </button>
      </div>

      <div className="flex items-center gap-2 px-5 py-3 bg-white border-b border-gray-100 flex-wrap no-print">
        <button onClick={handleRegenerate} disabled={regenerating} className="btn-ghost text-xs">
          <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
          Regenerate
        </button>
        <button onClick={() => window.print()} className="btn-ghost text-xs">
          <Printer size={12} /> Print
        </button>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {(['easy', 'medium', 'hard'] as const).map(d => diffBreakdown[d] > 0 && (
              <span key={d} className={`badge-${d}`}>{diffBreakdown[d]} {d}</span>
            ))}
          </div>
          <span className="text-xs text-gray-400">
            Generated {format(new Date(paper.generatedAt), 'MMM d, h:mm a')}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 text-center">
            <h1 className="text-lg font-bold text-gray-900 uppercase tracking-wider">
              {paper.schoolName}
            </h1>
            <div className="mt-3 text-sm text-gray-700 space-y-1">
              <p>
                <span className="font-medium">Subject:</span> {paper.subject}
                <span className="mx-4 text-gray-300">|</span>
                <span className="font-medium">Class:</span> {paper.grade}
              </p>
              <p className="text-sm font-semibold text-gray-900">{paper.title}</p>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-sm text-gray-500">
              <span>Time Allowed: <strong className="text-gray-800">{paper.duration} minutes</strong></span>
              <span>Maximum Marks: <strong className="text-gray-800">{paper.totalMarks}</strong></span>
            </div>
          </div>

          <div className="px-8 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-600 italic">
              All questions are compulsory unless stated otherwise. Read each question carefully before answering.
            </p>
          </div>

          <div className="px-8 py-5 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-6">
              {['Name', 'Roll Number', 'Class / Section'].map(label => (
                <div key={label}>
                  <p className="text-xs text-gray-500 mb-1">{label}:</p>
                  <div className="border-b-2 border-gray-300 h-7" />
                </div>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {paper.sections.map((section) => (
              <div key={section.id} className="px-8 py-6">
                <div className="mb-5">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-sm font-bold text-gray-900 uppercase">{section.label}</h2>
                    <span className="text-xs text-gray-500">[{section.totalMarks} Marks]</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 mt-0.5">{section.title}</h3>
                  <p className="text-xs text-gray-500 italic mt-0.5">{section.instruction}</p>
                </div>
                <div>
                  {section.questions.map((q, qi) => (
                    <QuestionItem key={q.id} q={q} index={qi + 1} showAnswer={showAnswer} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {showAnswer && (
            <div className="border-t-2 border-dashed border-gray-300 px-8 py-6 bg-gray-50 animate-fade-up">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-5 flex items-center gap-2">
                <Eye size={14} className="text-[#E8650A]" />
                Answer Key
              </h2>
              {paper.sections.map(section => (
                <div key={section.id} className="mb-5">
                  <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase">
                    {section.label} — {section.title}
                  </h3>
                  <div className="space-y-1.5">
                    {section.questions.map((q, qi) => q.answer ? (
                      <div key={q.id} className="flex gap-2 text-xs text-gray-600">
                        <span className="font-bold text-gray-800 flex-shrink-0">{qi + 1}.</span>
                        <span>{q.answer}</span>
                      </div>
                    ) : null)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>{paper.schoolName} · {paper.subject} · {paper.grade}</span>
            <span>Prepared by: {paper.teacherName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssignmentOutputPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const { current, setCurrent, jobProgress } = useStore();
  const { add: toast } = useToast();
  useWebSocket(id);

  // Initial load
  useEffect(() => {
    assignmentApi.get(id)
      .then(setCurrent)
      .catch(() => {
        toast('error', 'Assignment not found');
        router.push('/assignments');
      })
      .finally(() => setPageLoading(false));
  }, [id, setCurrent, router, toast]);

  // Polling fallback — kicks in when WebSocket doesn't deliver updates
  useEffect(() => {
    if (!current) return;
    if (current.status === 'complete' || current.status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const updated = await assignmentApi.get(id);
        setCurrent(updated);
        if (updated.status === 'complete' || updated.status === 'failed') {
          clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, current?.status, setCurrent]);

  if (pageLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={22} className="animate-spin text-gray-400" />
    </div>
  );

  if (!current) return null;
  const prog = jobProgress[id];

  return (
    <div className="h-full overflow-y-auto pb-16 md:pb-0">
      <div className="page-header no-print">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Link href="/assignments" className="hover:text-[#E8650A] transition-colors">Assignments</Link>
          <span>/</span>
          <span className="text-gray-600 font-medium truncate max-w-xs">{current.title}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">{current.title}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {current.subject} · {current.grade} · {current.schoolName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {current.status === 'complete' && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Ready
              </span>
            )}
            {current.status === 'processing' && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-orange-50 text-[#E8650A] border border-orange-200 px-3 py-1.5 rounded-full font-medium">
                <Loader2 size={11} className="animate-spin" />
                Generating
              </span>
            )}
            {current.status === 'failed' && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-full font-medium">
                <XCircle size={11} />
                Failed
              </span>
            )}
          </div>
        </div>
      </div>

      {(current.status === 'pending' || current.status === 'processing') && (
        <GeneratingView message={prog?.message} progress={prog?.progress} />
      )}

      {current.status === 'failed' && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6 animate-fade-in">
          <XCircle size={44} className="text-red-400 mb-4" />
          <h2 className="text-base font-semibold text-gray-800 mb-1.5">Generation failed</h2>
          <p className="text-sm text-gray-500 mb-1 max-w-xs">{current.error || 'Something went wrong with the AI generation.'}</p>
          <p className="text-xs text-gray-400 mb-6">Make sure your Groq API key is valid and has available credits.</p>
          <button
            onClick={async () => {
              await assignmentApi.regenerate(id);
              setCurrent({ ...current, status: 'pending', error: undefined });
              toast('info', 'Regeneration started...');
            }}
            className="btn-primary">
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      )}

      {current.status === 'complete' && current.paper && (
        <PaperView paper={current.paper} assignmentId={id} />
      )}
    </div>
  );
}
