import { router, useLocalSearchParams } from 'expo-router';

import { getErrorMessage } from '@/api/errors';
import { ClassroomForm } from '@/components/classroom';
import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { useTeacherClassroom, useUpdateClassroom } from '@/features/classrooms';

export default function EditClassroomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: classroom, error, refetch, isRefetching } = useTeacherClassroom(id);
  const updateClassroom = useUpdateClassroom(id);

  if (!classroom) {
    if (error) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} />;
    return <LoadingState />;
  }

  return (
    <Screen scroll keyboardAvoiding>
      <ClassroomForm
        initialValues={{
          name: classroom.name,
          subject: classroom.subject ?? '',
          description: classroom.description ?? '',
        }}
        submitLabel="Save changes"
        submitting={updateClassroom.isPending}
        errorMessage={updateClassroom.error ? getErrorMessage(updateClassroom.error) : null}
        onSubmit={(values) => updateClassroom.mutate(values, { onSuccess: () => router.back() })}
      />
    </Screen>
  );
}
