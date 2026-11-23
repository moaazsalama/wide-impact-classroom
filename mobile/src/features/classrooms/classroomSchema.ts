import { z } from 'zod';

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .transform((value) => (value.length > 0 ? value : null));

/** Mirrors the backend create/update validation (docs/API.md). Empty optional fields become null. */
export const classroomFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  subject: optionalText(100, 'Subject'),
  description: optionalText(500, 'Description'),
});

export type ClassroomFormValues = z.input<typeof classroomFormSchema>;
export type ClassroomFormOutput = z.output<typeof classroomFormSchema>;
export type ClassroomFormErrors = Partial<Record<keyof ClassroomFormValues, string>>;

export function validateClassroomForm(
  values: ClassroomFormValues,
): { success: true; data: ClassroomFormOutput } | { success: false; errors: ClassroomFormErrors } {
  const result = classroomFormSchema.safeParse(values);
  if (result.success) return { success: true, data: result.data };

  const errors: ClassroomFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ClassroomFormValues | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}
