import React, { useState } from 'react';
import { YStack, XStack, Text, Stack, ScrollView } from 'tamagui';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { LibraryHeader } from '../components/LibraryHeader';
import { StatusBadge } from '../components/StatusBadge';
import { libraryColors } from '../theme/colors';
import { useQueueStore } from '../store/queueStore';
import { useSettingsStore } from '../store/settingsStore';
import { staffApi } from '../services/api';
import { handlePrint } from '../services/printService';

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export const JobDetailScreen = ({ route, navigation }: any) => {
  const { jobId } = route.params;
  const job = useQueueStore((s) => s.jobs.find((j) => j.id === jobId));
  const updateJobStatus = useQueueStore((s) => s.updateJobStatus);
  const activePrinter = useSettingsStore((s) => s.getActivePrinter());

  const [printing, setPrinting] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (!job) {
    return (
      <ScreenContainer>
        <LibraryHeader title="Job Detail" />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text fontSize={18} color={libraryColors.mediumGray}>Job not found</Text>
        </YStack>
      </ScreenContainer>
    );
  }

  const ticketStr = `#${String(job.ticket_number).padStart(3, '0')}`;
  const colorLabel = job.color_mode === 'color' ? 'Color' : 'B&W';
  const pageRange = job.page_range_start
    ? `Pages ${job.page_range_start}-${job.page_range_end ?? job.page_count}`
    : `All ${job.page_count}`;
  const isActive = ['waiting', 'reviewing', 'printing'].includes(job.status);
  const isPrinted = !!(job as any).printed;
  const isPaid = !!(job as any).paid;

  const handlePrintPress = async () => {
    setPrinting(true);
    setPrintMessage(null);
    try {
      await staffApi.updateJobStatus(job.id, 'reviewing');
      updateJobStatus(job.id, 'reviewing');
    } catch {}

    const result = await handlePrint(job.id);
    setPrinting(false);
    setPrintMessage(result.message);
    if (result.success) {
      useQueueStore.getState().updateJob({ ...job, printed: 1 as any, status: isPaid ? 'completed' : 'printing' });
    }
  };

  const handleMarkPaid = async () => {
    setActionLoading(true);
    try {
      const result = await staffApi.markPaid(job.id);
      if (result.job) {
        useQueueStore.getState().updateJob(result.job);
      }
      setPrintMessage(isPaid ? 'Payment removed' : 'Marked as paid');
    } catch (err: any) {
      setPrintMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await staffApi.updateJobStatus(job.id, 'rejected');
      updateJobStatus(job.id, 'rejected');
    } catch (err: any) {
      setPrintMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <LibraryHeader title={`Ticket ${ticketStr}`} />

      {/* Scrollable content */}
      <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 16 }}>
        {/* Status + cost row */}
        <XStack justifyContent="space-between" alignItems="center">
          <StatusBadge status={job.status as any} />
          <Text fontSize={22} fontWeight="700" color={libraryColors.primaryDark}>
            {formatCost(job.estimated_cost)}
          </Text>
        </XStack>

        {/* Single info card — file + settings merged */}
        <YStack
          padding={14}
          backgroundColor={libraryColors.lightGray}
          borderRadius={12}
          gap={6}
        >
          <Text fontSize={16} fontWeight="600" color={libraryColors.charcoal} numberOfLines={2}>
            {job.original_filename}
          </Text>
          <XStack gap={6} flexWrap="wrap" alignItems="center">
            <InfoChip label={pageRange} />
            <InfoChip label={colorLabel} />
            {job.copies > 1 && <InfoChip label={`×${job.copies} copies`} highlight />}
          </XStack>
        </YStack>

        {/* Page thumbnails */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap={8} paddingVertical={2}>
            {Array.from({ length: Math.min(job.page_count, 20) }, (_, i) => (
              <PageThumbnail
                key={i}
                jobId={job.id}
                page={i}
                pageLabel={i + 1}
                grayscale={job.color_mode === 'bw'}
              />
            ))}
          </XStack>
        </ScrollView>

        {/* Status message */}
        {printMessage && (
          <YStack padding={10} backgroundColor={printMessage.startsWith('Error') ? libraryColors.errorLight : libraryColors.primaryLight} borderRadius={8}>
            <Text fontSize={14} color={printMessage.startsWith('Error') ? libraryColors.error : libraryColors.primaryDark}>
              {printMessage}
            </Text>
          </YStack>
        )}

        {/* No printer warning */}
        {isActive && !activePrinter && (
          <YStack padding={10} backgroundColor={libraryColors.warningLight} borderRadius={8}>
            <Text fontSize={14} color={libraryColors.warning} textAlign="center">
              No printer selected. Go to Settings to choose a printer.
            </Text>
          </YStack>
        )}
      </ScrollView>

      {/* Pinned action bar — buttons never disappear */}
      <YStack
        padding={12}
        gap={8}
        borderTopWidth={1}
        borderTopColor={libraryColors.borderLight}
        backgroundColor={libraryColors.white}
      >
        {isActive && (
          <>
            <XStack gap={8}>
              {/* Print button — always available */}
              <ActionButton
                flex
                label={printing ? 'Sending...' : isPrinted ? 'Print Again' : 'Print'}
                icon={printing ? undefined : isPrinted ? 'refresh' : 'print'}
                color={libraryColors.white}
                bg={isPrinted ? libraryColors.mediumGray : libraryColors.primary}
                onPress={handlePrintPress}
                disabled={printing || !activePrinter}
              />

              {/* Paid toggle — always available */}
              <ActionButton
                flex
                label={actionLoading ? '...' : isPaid ? 'Paid ✓' : 'Mark as Paid'}
                icon={isPaid ? 'checkmark-circle' : 'cash'}
                color={isPaid ? libraryColors.primaryDark : libraryColors.white}
                bg={isPaid ? libraryColors.primaryLight : libraryColors.primaryDark}
                onPress={handleMarkPaid}
                disabled={actionLoading}
              />
            </XStack>

            {/* Reject — always available */}
            <ActionButton
              label={actionLoading ? 'Rejecting...' : 'Reject'}
              color={libraryColors.error}
              bg={libraryColors.errorLight}
              onPress={handleReject}
              disabled={actionLoading}
            />
          </>
        )}

        {/* Back link */}
        <Stack paddingVertical={4} alignItems="center" pressStyle={{ opacity: 0.7 }} onPress={() => navigation.goBack()} cursor="pointer">
          <Text fontSize={14} color={libraryColors.primary} fontWeight="600">← Back to Queue</Text>
        </Stack>
      </YStack>
    </ScreenContainer>
  );
};

const InfoChip = ({ label, highlight }: { label: string; highlight?: boolean }) => (
  <Stack
    paddingHorizontal={10}
    paddingVertical={4}
    borderRadius={8}
    backgroundColor={highlight ? '#FFF3E0' : libraryColors.white}
    borderWidth={1}
    borderColor={highlight ? '#F57C00' : libraryColors.border}
  >
    <Text fontSize={13} fontWeight={highlight ? '700' : '500'} color={highlight ? '#E65100' : libraryColors.charcoal}>
      {label}
    </Text>
  </Stack>
);

const PageThumbnail = ({ jobId, page, pageLabel, grayscale }: { jobId: string; page: number; pageLabel: number; grayscale?: boolean }) => {
  const [hasError, setHasError] = React.useState(false);
  const thumbnailUrl = staffApi.getThumbnailUrl(jobId, page);

  const imageStyle: any = { width: 120, height: 156, backgroundColor: '#F5F5F5' };
  if (grayscale) {
    imageStyle.filter = 'grayscale(100%)';
    imageStyle.opacity = 0.85;
  }

  return (
    <Stack width={120} height={170} borderRadius={6} borderWidth={1} borderColor={libraryColors.border} overflow="hidden" backgroundColor={libraryColors.lightGray}>
      {!hasError ? (
        <Image source={{ uri: thumbnailUrl }} style={imageStyle} resizeMode="contain" onError={() => setHasError(true)} />
      ) : (
        <Stack flex={1} alignItems="center" justifyContent="center">
          <Ionicons name="document-outline" size={24} color={libraryColors.mediumGray} />
        </Stack>
      )}
      <Stack height={14} backgroundColor={libraryColors.white} alignItems="center" justifyContent="center" borderTopWidth={1} borderTopColor={libraryColors.borderLight}>
        <Text fontSize={10} color={libraryColors.mediumGray}>{pageLabel}</Text>
      </Stack>
    </Stack>
  );
};

const ActionButton = ({
  label, color, bg, onPress, disabled, icon, flex,
}: { label: string; color: string; bg: string; onPress: () => void; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap; flex?: boolean }) => (
  <Stack
    minHeight={48}
    paddingHorizontal={16}
    paddingVertical={12}
    backgroundColor={disabled ? libraryColors.border : bg}
    borderRadius={10}
    alignItems="center"
    justifyContent="center"
    flexDirection="row"
    gap={8}
    flex={flex ? 1 : undefined}
    pressStyle={{ opacity: 0.85, scale: 0.98 }}
    onPress={disabled ? undefined : onPress}
    cursor={disabled ? 'not-allowed' : 'pointer'}
    opacity={disabled ? 0.6 : 1}
  >
    {icon && <Ionicons name={icon} size={18} color={disabled ? libraryColors.mediumGray : color} />}
    <Text fontSize={15} fontWeight="600" color={disabled ? libraryColors.mediumGray : color}>
      {label}
    </Text>
  </Stack>
);
