import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { Button, InlineMessage, TextField } from '@/components/ui';
import {
  validateClassroomForm,
  type ClassroomFormErrors,
  type ClassroomFormOutput,
  type ClassroomFormValues,
} from '@/features/classrooms';
import { spacing } from '@/theme';

export interface ClassroomFormProps {
  initialValues?: Partial<ClassroomFormValues>;
  submitLabel: string;
  submitting?: boolean;
  /** Server error message to show above the submit button. */
  errorMessage?: string | null;
  onSubmit: (values: ClassroomFormOutput) => void;
}

export function ClassroomForm({ initialValues, submitLabel, submitting, errorMessage, onSubmit }: ClassroomFormProps) {
  const [values, setValues] = useState<ClassroomFormValues>({
    name: initialValues?.name ?? '',
    subject: initialValues?.subject ?? '',
    description: initialValues?.description ?? '',
  });
  const [errors, setErrors] = useState<ClassroomFormErrors>({});
  const subjectRef = useRef<TextInputInstance>(null);
  const descriptionRef = useRef<TextInputInstance>(null);

  const update = (key: keyof ClassroomFormValues) => (text: string) => {
    setValues((prev) => ({ ...prev, [key]: text }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = () => {
    const result = validateClassroomForm(values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.data);
  };

  return (
    <View style={styles.form}>
      <TextField
        label="Class name"
        placeholder="e.g. Math 101"
        value={values.name}
        onChangeText={update('name')}
        error={errors.name}
        maxLength={100}
        autoFocus={!initialValues?.name}
        returnKeyType="next"
        onSubmitEditing={() => subjectRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={subjectRef}
        label="Subject (optional)"
        placeholder="e.g. Mathematics"
        value={values.subject}
        onChangeText={update('subject')}
        error={errors.subject}
        maxLength={100}
        returnKeyType="next"
        onSubmitEditing={() => descriptionRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={descriptionRef}
        label="Description (optional)"
        placeholder="What is this class about?"
        value={values.description}
        onChangeText={update('description')}
        error={errors.description}
        maxLength={500}
        showCounter
        multiline
      />
      {errorMessage ? <InlineMessage tone="error" message={errorMessage} /> : null}
      <Button title={submitLabel} onPress={handleSubmit} loading={submitting} size="lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
});
