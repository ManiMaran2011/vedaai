import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Assignment, GeneratedPaper, JobStatus, TeacherProfile } from '@/types';

interface Progress { progress: number; message: string; }

interface AppStore {
  assignments: Assignment[];
  current: Assignment | null;
  jobProgress: Record<string, Progress>;
  profile: TeacherProfile;

  setAssignments: (a: Assignment[]) => void;
  addAssignment: (a: Assignment) => void;
  setCurrent: (a: Assignment | null) => void;
  removeAssignment: (id: string) => void;
  updateStatus: (id: string, status: JobStatus, error?: string) => void;
  updatePaper: (id: string, paper: GeneratedPaper) => void;
  setProgress: (id: string, p: Progress) => void;
  clearProgress: (id: string) => void;
  setProfile: (p: TeacherProfile) => void;
  updateProfile: (p: Partial<TeacherProfile>) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      assignments: [],
      current: null,
      jobProgress: {},
      profile: {
        name: 'John Doe',
        schoolName: 'My School',
        schoolLocation: 'City',
        subject: 'General',
        avatarInitials: 'JD',
      },

      setAssignments: (assignments) => set({ assignments }),
      addAssignment: (a) => set((s) => ({ assignments: [a, ...s.assignments] })),
      setCurrent: (current) => set({ current }),
      removeAssignment: (id) => set((s) => ({ assignments: s.assignments.filter(a => a.id !== id) })),

      updateStatus: (id, status, error) => set((s) => ({
        assignments: s.assignments.map(a => a.id === id ? { ...a, status, ...(error ? { error } : {}) } : a),
        current: s.current?.id === id ? { ...s.current, status, ...(error ? { error } : {}) } : s.current,
      })),

      updatePaper: (id, paper) => set((s) => ({
        assignments: s.assignments.map(a => a.id === id ? { ...a, status: 'complete' as JobStatus, paper, hasPaper: true } : a),
        current: s.current?.id === id ? { ...s.current, status: 'complete' as JobStatus, paper } : s.current,
      })),

      setProgress: (id, p) => set((s) => ({ jobProgress: { ...s.jobProgress, [id]: p } })),
      clearProgress: (id) => set((s) => {
        const next = { ...s.jobProgress };
        delete next[id];
        return { jobProgress: next };
      }),

      setProfile: (profile) => set({ profile }),
      updateProfile: (p) => set((s) => ({
        profile: {
          ...s.profile, ...p,
          avatarInitials: (p.name || s.profile.name)
            .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
        },
      })),
    }),
    {
      name: 'vedaai-store',
      partialize: (s) => ({ profile: s.profile }),
    }
  )
);
