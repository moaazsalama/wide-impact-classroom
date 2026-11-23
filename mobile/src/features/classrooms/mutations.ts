import { useMutation, useQueryClient } from '@tanstack/react-query';

import { classroomsApi } from '@/api/classrooms';
import type { ClassroomInput, ClassroomPatch, JoinBody, Student } from '@/types/api';

import { classroomKeys } from './queryKeys';

// ---------------------------------------------------------------------------
// Teacher
// ---------------------------------------------------------------------------

export function useCreateClassroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClassroomInput) => classroomsApi.create(input),
    onSuccess: (classroom) => {
      qc.setQueryData(classroomKeys.detail(classroom.id), classroom);
      return qc.invalidateQueries({ queryKey: classroomKeys.lists() });
    },
  });
}

export function useUpdateClassroom(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ClassroomPatch) => classroomsApi.update(id, patch),
    onSuccess: (classroom) => {
      qc.setQueryData(classroomKeys.detail(id), classroom);
      return qc.invalidateQueries({ queryKey: classroomKeys.lists() });
    },
  });
}

export function useDeleteClassroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classroomsApi.remove(id),
    // The detail entry is left to garbage collection: removing it while the screen is
    // still mounted (mid back-navigation) would trigger a refetch that 404s.
    onSuccess: () => qc.invalidateQueries({ queryKey: classroomKeys.lists() }),
  });
}

export function useRegenerateJoinCode(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => classroomsApi.regenerateJoinCode(id),
    onSuccess: (classroom) => {
      qc.setQueryData(classroomKeys.detail(id), classroom);
      return qc.invalidateQueries({ queryKey: classroomKeys.lists() });
    },
  });
}

/** Optimistically removes the student from the roster, rolling back on failure. */
export function useRemoveStudent(classroomId: string) {
  const qc = useQueryClient();
  const studentsKey = classroomKeys.students(classroomId);

  return useMutation({
    mutationFn: (studentId: string) => classroomsApi.removeStudent(classroomId, studentId),
    onMutate: async (studentId) => {
      await qc.cancelQueries({ queryKey: studentsKey });
      const previous = qc.getQueryData<Student[]>(studentsKey);
      qc.setQueryData<Student[]>(studentsKey, (old) => old?.filter((s) => s.id !== studentId));
      return { previous };
    },
    onError: (_error, _studentId, context) => {
      if (context?.previous) qc.setQueryData(studentsKey, context.previous);
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: studentsKey }),
        qc.invalidateQueries({ queryKey: classroomKeys.detail(classroomId), exact: true }),
        qc.invalidateQueries({ queryKey: classroomKeys.lists() }),
      ]),
  });
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

export function useJoinClassroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: JoinBody) => classroomsApi.join(body),
    onSuccess: ({ classroom }) => {
      qc.setQueryData(classroomKeys.detail(classroom.id), classroom);
      return qc.invalidateQueries({ queryKey: classroomKeys.lists() });
    },
  });
}

export function useLeaveClassroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classroomsApi.leave(id),
    // The detail entry is left to garbage collection: removing it while the screen is
    // still mounted (mid back-navigation) would trigger a refetch that 404s.
    onSuccess: () => qc.invalidateQueries({ queryKey: classroomKeys.lists() }),
  });
}
