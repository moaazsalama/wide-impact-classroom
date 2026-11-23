import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { HeaderProfileButton } from '@/components/navigation/HeaderProfileButton';
import { IconButton } from '@/components/ui';
import { stackScreenOptions } from '@/lib/navigation';
import { spacing } from '@/theme';

export const unstable_settings = { anchor: 'index' };

export default function TeacherLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: 'My classrooms',
          headerBackVisible: false,
          headerRight: () => (
            <View style={styles.headerRight}>
              <IconButton
                icon="add-circle-outline"
                size={28}
                accessibilityLabel="Create classroom"
                onPress={() => router.push('/(teacher)/classrooms/new')}
              />
              <HeaderProfileButton />
            </View>
          ),
        }}
      />
      <Stack.Screen name="classrooms/new" options={{ title: 'New classroom', presentation: 'modal' }} />
      <Stack.Screen name="classrooms/[id]/index" options={{ title: 'Classroom' }} />
      <Stack.Screen name="classrooms/[id]/edit" options={{ title: 'Edit classroom', presentation: 'modal' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
