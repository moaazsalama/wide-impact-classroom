import { router } from 'expo-router';

import { getErrorMessage } from '@/api/errors';
import { ClassroomForm } from '@/components/classroom';
import { Screen } from '@/components/ui';
import { useCreateClassroom } from '@/features/classrooms';

export default function NewClassroomScreen() {
  const createClassroom = useCreateClassroom();

  return (
    <Screen scroll keyboardAvoiding>
      <ClassroomForm
        submitLabel="Create classroom"
        submitting={createClassroom.isPending}
        errorMessage={createClassroom.error ? getErrorMessage(createClassroom.error) : null}
        onSubmit={(values) =>
          createClassroom.mutate(values, {
            onSuccess: (classroom) =>
              router.replace({ pathname: '/(teacher)/classrooms/[id]', params: { id: classroom.id } }),
          })
        }
      />
    </Screen>
  );
}
