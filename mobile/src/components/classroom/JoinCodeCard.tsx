import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppText, Button, Card } from '@/components/ui';
import { buildJoinUrl } from '@/features/join';
import { formatJoinCode, formatRelative } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { TeacherClassroom } from '@/types/api';

export interface JoinCodeCardProps {
  classroom: TeacherClassroom;
  onRegenerate: () => void;
  regenerating?: boolean;
}

export function JoinCodeCard({ classroom, onRegenerate, regenerating }: JoinCodeCardProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = buildJoinUrl(classroom.joinCode);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(classroom.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = () =>
    Share.share({
      title: `Join ${classroom.name}`,
      message:
        `Join my class "${classroom.name}" on Wide Impact Classroom.\n\n` +
        `Class code: ${classroom.joinCode}\n` +
        `Or open this link on your phone: ${joinUrl}`,
    });

  return (
    <Card style={styles.card}>
      <AppText variant="label" align="center">
        STUDENTS SCAN TO JOIN
      </AppText>

      <View style={[styles.qrWrap, regenerating && styles.dimmed]} accessibilityLabel={`QR code for join code ${classroom.joinCode}`}>
        <QRCode value={joinUrl} size={196} color={colors.text} backgroundColor={colors.surface} ecl="M" />
      </View>

      <View style={styles.codeBlock}>
        <AppText variant="caption">or enter the code</AppText>
        <AppText variant="code" selectable accessibilityLabel={`Join code ${classroom.joinCode.split('').join(' ')}`}>
          {formatJoinCode(classroom.joinCode)}
        </AppText>
        <AppText variant="caption" color={colors.textSubtle}>
          Code updated {formatRelative(classroom.joinCodeUpdatedAt)}
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button
          title={copied ? 'Copied' : 'Copy'}
          icon={copied ? 'checkmark' : 'copy-outline'}
          variant="secondary"
          onPress={handleCopy}
          style={styles.action}
        />
        <Button title="Share" icon="share-outline" variant="secondary" onPress={handleShare} style={styles.action} />
      </View>
      <Button
        title="Generate new code"
        icon="refresh"
        variant="ghost"
        size="sm"
        loading={regenerating}
        onPress={onRegenerate}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.md },
  qrWrap: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dimmed: { opacity: 0.3 },
  codeBlock: { alignItems: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  action: { flex: 1 },
});
