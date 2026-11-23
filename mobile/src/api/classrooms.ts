import type {
  ClassroomEnvelope,
  ClassroomInput,
  ClassroomPatch,
  ClassroomPreview,
  ClassroomsEnvelope,
  JoinBody,
  JoinResponse,
  Student,
  StudentClassroom,
  StudentsEnvelope,
  TeacherClassroom,
} from '@/types/api';

import { apiClient } from './client';

const path = (id: string) => `/classrooms/${encodeURIComponent(id)}`;

export const classroomsApi = {
  // ---- Shared (response shape depends on the caller's role) ----
  async list<T extends TeacherClassroom | StudentClassroom>(): Promise<T[]> {
    const { data } = await apiClient.get<ClassroomsEnvelope<T>>('/classrooms');
    return data.classrooms;
  },

  async get<T extends TeacherClassroom | StudentClassroom>(id: string): Promise<T> {
    const { data } = await apiClient.get<ClassroomEnvelope<T>>(path(id));
    return data.classroom;
  },

  // ---- Teacher ----
  async create(input: ClassroomInput): Promise<TeacherClassroom> {
    const { data } = await apiClient.post<ClassroomEnvelope<TeacherClassroom>>('/classrooms', input);
    return data.classroom;
  },

  async update(id: string, patch: ClassroomPatch): Promise<TeacherClassroom> {
    const { data } = await apiClient.patch<ClassroomEnvelope<TeacherClassroom>>(path(id), patch);
    return data.classroom;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(path(id));
  },

  async regenerateJoinCode(id: string): Promise<TeacherClassroom> {
    const { data } = await apiClient.post<ClassroomEnvelope<TeacherClassroom>>(`${path(id)}/join-code`);
    return data.classroom;
  },

  async listStudents(id: string): Promise<Student[]> {
    const { data } = await apiClient.get<StudentsEnvelope>(`${path(id)}/students`);
    return data.students;
  },

  async removeStudent(id: string, studentId: string): Promise<void> {
    await apiClient.delete(`${path(id)}/students/${encodeURIComponent(studentId)}`);
  },

  // ---- Student ----
  async lookup(code: string): Promise<ClassroomPreview> {
    const { data } = await apiClient.get<ClassroomEnvelope<ClassroomPreview>>('/classrooms/lookup', {
      params: { code },
    });
    return data.classroom;
  },

  async join(body: JoinBody): Promise<JoinResponse> {
    const { data } = await apiClient.post<JoinResponse>('/classrooms/join', body);
    return data;
  },

  async leave(id: string): Promise<void> {
    await apiClient.post(`${path(id)}/leave`);
  },
};
