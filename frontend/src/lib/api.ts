import axios from 'axios';
import type { Assignment, AssignmentInput, TeacherProfile } from '@/types';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const http = axios.create({ baseURL: `${BASE}/api` });

export interface CreatePayload extends AssignmentInput { file?: File; }

export const assignmentApi = {
  async create(payload: CreatePayload): Promise<Assignment> {
    const { file, ...data } = payload;
    if (file) {
      const form = new FormData();
      form.append('data', JSON.stringify(data));
      form.append('file', file);
      return (await http.post<{ assignment: Assignment }>('/assignments', form)).data.assignment;
    }
    return (await http.post<{ assignment: Assignment }>('/assignments', data)).data.assignment;
  },
  async list(): Promise<Assignment[]> {
    return (await http.get<{ assignments: Assignment[] }>('/assignments')).data.assignments;
  },
  async get(id: string): Promise<Assignment> {
    return (await http.get<{ assignment: Assignment }>(`/assignments/${id}`)).data.assignment;
  },
  async delete(id: string): Promise<void> {
    await http.delete(`/assignments/${id}`);
  },
  async regenerate(id: string): Promise<void> {
    await http.post(`/assignments/${id}/regenerate`);
  },
};

export const profileApi = {
  async get(): Promise<TeacherProfile> {
    return (await http.get<{ profile: TeacherProfile }>('/profile')).data.profile;
  },
  async update(data: Partial<TeacherProfile>): Promise<TeacherProfile> {
    return (await http.put<{ profile: TeacherProfile }>('/profile', data)).data.profile;
  },
};
