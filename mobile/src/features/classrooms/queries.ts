import { useQuery } from '@tanstack/react-query';

import { classroomsApi } from '@/api/classrooms';
import { isValidJoinCode } from '@/features/join';
import type { StudentClassroom, TeacherClassroom } from '@/types/api';

import { classroomKeys } from './queryKeys';

/**
 * GET /classrooms returns a role-dependent shape. The cache is cleared on every
 * sign-in/sign-out, so a single key per session is safe for both variants.
 */
export function useTeacherClassrooms() {
  return useQuery({
    queryKey: classroomKeys.lists(),
    queryFn: () => classroomsApi.list<TeacherClassroom>(),
  });
}

export function useStudentClassrooms() {
  return useQuery({
    queryKey: classroomKeys.lists(),
    queryFn: () => classroomsApi.list<StudentClassroom>(),
  });
}

export function useTeacherClassroom(id: string | undefined) {
  return useQuery({
    queryKey: classroomKeys.detail(id ?? ''),
    queryFn: () => classroomsApi.get<TeacherClassroom>(id!),
    enabled: Boolean(id),
  });
}

export function useStudentClassroom(id: string | undefined) {
  return useQuery({
    queryKey: classroomKeys.detail(id ?? ''),
    queryFn: () => classroomsApi.get<StudentClassroom>(id!),
    enabled: Boolean(id),
  });
}

export function useStudents(classroomId: string | undefined) {
  return useQuery({
    queryKey: classroomKeys.students(classroomId ?? ''),
    queryFn: () => classroomsApi.listStudents(classroomId!),
    enabled: Boolean(classroomId),
  });
}

/** Preview a classroom by join code before joining. Not retried: 404/429 are final. */
export function useLookupClassroom(code: string | undefined) {
  return useQuery({
    queryKey: classroomKeys.lookup(code ?? ''),
    queryFn: () => classroomsApi.lookup(code!),
    enabled: isValidJoinCode(code),
    retry: false,
    staleTime: 0,
    gcTime: 60_000,
  });
}
