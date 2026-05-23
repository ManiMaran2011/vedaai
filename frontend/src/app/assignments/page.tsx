'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, SlidersHorizontal, MoreVertical, Eye, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { assignmentApi } from '@/lib/api';
import { useStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/components/ui/Toast';
import { format } from 'date-fns';
import type { Assignment } from '@/types';
import clsx from 'clsx';

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: Assignment['status'] }) {
  const map = {
    pending:    { label: 'Queued',      cls: 'bg-gray-100 text-gray-500' },
    processing: { label: 'Generating',  cls: 'bg-blue-50 text-blue-600' },
    complete:   { label: 'Ready',       cls: 'bg-green-50 text-green-600' },
    failed:     { label: 'Failed',      cls: 'bg-red-50 text-red-500' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {status === 'processing' && <Loader2 size={9} className="inline animate-spin mr-1" />}
      {label}
    </span>
  );
}

// ─── 3-dot dropdown menu ──────────────────────────────────────────────────────
function CardMenu({ assignment, onDelete }: { assignment: Assignment; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-gray-100 z-20 w-40 animate-slide-down overflow-hidden">
          <button
            onClick={e => { e.preventDefault(); router.push(`/assignments/${assignment.id}`); }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Eye size={14} />
            View Assignment
          </button>
          <div className="h-px bg-gray-100" />
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); setOpen(false); }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Assignment card ──────────────────────────────────────────────────────────
function AssignmentCard({ assignment, onDelete }: { assignment: Assignment; onDelete: () => void }) {
  const { jobProgress } = useStore();
  const progress = jobProgress[assignment.id];

  return (
    <Link href={`/assignments/${assignment.id}`}
      className="card p-4 block hover:shadow-md hover:border-gray-300 transition-all duration-200 group animate-fade-up">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate group-hover:text-[#E8650A] transition-colors">
            {assignment.title}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{assignment.subject} · {assignment.grade}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusChip status={assignment.status} />
          <CardMenu assignment={assignment} onDelete={onDelete} />
        </div>
      </div>

      {/* Progress bar when generating */}
      {assignment.status === 'processing' && progress && (
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span className="truncate">{progress.message}</span>
            <span className="ml-2 flex-shrink-0">{progress.progress}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#E8650A] rounded-full progress-stripe transition-all duration-500"
              style={{ width: `${progress.progress}%` }} />
          </div>
        </div>
      )}

      {assignment.status === 'failed' && (
        <div className="text-xs text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5 mb-2">
          Generation failed — click to retry
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
        <span>
          <span>Assigned on : </span>
          <span className="text-gray-600 font-medium">
            {format(new Date(assignment.assignedOn || assignment.createdAt), 'dd-MM-yyyy')}
          </span>
        </span>
        {assignment.dueDate && (
          <span>
            <span>Due : </span>
            <span className="text-gray-600 font-medium">{format(new Date(assignment.dueDate), 'dd-MM-yyyy')}</span>
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="card p-4">
      <div className="skeleton h-4 w-3/4 mb-2" />
      <div className="skeleton h-3 w-1/3 mb-5" />
      <div className="flex justify-between">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-3 w-20" />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 bg-[#EBEBEB] m-4 rounded-2xl flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
      {/* Illustration */}
      <div className="relative mb-6 w-32 h-32">
        <div className="absolute inset-0 rounded-full bg-gray-200/60" />
        <div className="absolute inset-4 flex items-center justify-center">
          <div className="relative">
            <div className="w-14 h-18 bg-white rounded-lg border border-gray-200 p-2 space-y-1.5 shadow-sm">
              <div className="h-1.5 bg-gray-200 rounded w-full" />
              <div className="h-1.5 bg-gray-200 rounded w-3/4" />
              <div className="h-1.5 bg-gray-200 rounded w-full" />
              <div className="h-1.5 bg-gray-200 rounded w-1/2" />
              <div className="h-1.5 bg-gray-200 rounded w-5/6" />
            </div>
            <div className="absolute -bottom-2 -right-3 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
              <span className="text-red-400 text-base font-bold leading-none">✕</span>
            </div>
            <div className="absolute -top-2 -right-5 opacity-50">
              <div className="w-8 h-8 rounded-full border-[2.5px] border-gray-400" />
            </div>
          </div>
        </div>
        <div className="absolute top-3 right-2 text-[#6C8EF5] text-lg font-bold leading-none">✦</div>
        <div className="absolute bottom-5 left-1 text-[#6C8EF5] text-sm font-bold leading-none">✦</div>
      </div>

      <h3 className="text-base font-semibold text-gray-800 mb-2">No assignments yet</h3>
      <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-7">
        Create your first assignment to start collecting and grading student submissions.
        You can set up rubrics, define marking criteria, and let AI assist with grading.
      </p>
      <Link href="/assignments/new" className="btn-primary">
        <Plus size={15} />
        Create Your First Assignment
      </Link>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AssignmentsPage() {
  const { assignments, setAssignments, removeAssignment } = useStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { add: toast } = useToast();
  useWebSocket();

  const load = async () => {
    try {
      const data = await assignmentApi.list();
      setAssignments(data);
    } catch {
      toast('error', 'Failed to load assignments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    removeAssignment(id);
    try {
      await assignmentApi.delete(id);
      toast('success', 'Assignment deleted');
    } catch {
      toast('error', 'Failed to delete assignment');
    }
  };

  const filtered = assignments.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.subject?.toLowerCase().includes(search.toLowerCase()) ||
    a.grade?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col pb-16 md:pb-0">
      {/* Page header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              <h1 className="text-sm font-semibold text-gray-900">Assignments</h1>
            </div>
            <p className="text-xs text-gray-400">Manage and create assignments for your classes.</p>
          </div>
          <button onClick={() => { setRefreshing(true); load(); }}
            className="btn-ghost text-xs" disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          <div className="flex gap-3 mb-4">
            <div className="skeleton h-8 w-24 rounded-xl" />
            <div className="skeleton h-8 flex-1 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filter + Search */}
          <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-100">
            <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1.5">
              <SlidersHorizontal size={13} />
              Filter By
            </button>
            <div className="flex-1 relative max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50
                           placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all"
                placeholder="Search Assignment"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-5">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                No results for &ldquo;{search}&rdquo;
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map(a => (
                  <AssignmentCard key={a.id} assignment={a} onDelete={() => handleDelete(a.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating create button */}
      {assignments.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-30 no-print">
          <Link href="/assignments/new" className="btn-primary shadow-xl shadow-black/20 px-6 py-3 text-sm">
            <Plus size={15} />
            Create Assignment
          </Link>
        </div>
      )}
    </div>
  );
}
