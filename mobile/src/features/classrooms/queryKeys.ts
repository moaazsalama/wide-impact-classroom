export const classroomKeys = {
  all: ['classrooms'] as const,
  lists: () => [...classroomKeys.all, 'list'] as const,
  details: () => [...classroomKeys.all, 'detail'] as const,
  detail: (id: string) => [...classroomKeys.details(), id] as const,
  students: (id: string) => [...classroomKeys.detail(id), 'students'] as const,
  lookup: (code: string) => [...classroomKeys.all, 'lookup', code] as const,
};
