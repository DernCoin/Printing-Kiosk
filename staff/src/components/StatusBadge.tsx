import React from 'react';
import { Stack, Text } from 'tamagui';
import { libraryColors } from '../theme/colors';

type JobStatus = 'waiting' | 'reviewing' | 'printing' | 'completed' | 'rejected' | 'expired';

interface StatusBadgeProps {
  status: JobStatus;
}

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  waiting: { label: 'Waiting', color: libraryColors.statusWaiting, bg: libraryColors.statusWaitingBg },
  reviewing: { label: 'Reviewing', color: libraryColors.statusReviewing, bg: libraryColors.statusReviewingBg },
  printing: { label: 'Printing', color: libraryColors.statusPrinting, bg: libraryColors.statusPrintingBg },
  completed: { label: 'Completed', color: libraryColors.statusCompleted, bg: libraryColors.statusCompletedBg },
  rejected: { label: 'Rejected', color: libraryColors.statusRejected, bg: libraryColors.statusRejectedBg },
  expired: { label: 'Expired', color: libraryColors.mediumGray, bg: libraryColors.lightGray },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.waiting;

  return (
    <Stack
      paddingHorizontal={12}
      paddingVertical={6}
      borderRadius={20}
      backgroundColor={config.bg}
    >
      <Text fontSize={13} fontWeight="600" color={config.color}>
        {config.label}
      </Text>
    </Stack>
  );
};
