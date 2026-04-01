import React from 'react';
import { YStack, XStack, Text, Stack } from 'tamagui';
import { libraryColors } from '../theme/colors';
import { StatusBadge } from './StatusBadge';

interface Job {
  id: string;
  ticket_number: number;
  status: string;
  color_mode: string;
  copies: number;
  page_count: number;
  estimated_cost: number;
  original_filename: string;
  source: string;
  created_at: string;
}

interface JobCardProps {
  job: Job;
  onPress: (job: Job) => void;
  now: number;
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getRelativeTime(createdAt: string, now: number): { text: string; color: string } {
  const diffMs = now - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  let text: string;
  if (diffMin < 1) text = 'Just now';
  else if (diffMin === 1) text = '1 min ago';
  else text = `${diffMin} min ago`;

  let color: string = libraryColors.mediumGray;
  if (diffMin >= 10) color = libraryColors.error;
  else if (diffMin >= 5) color = '#F57C00';

  return { text, color };
}

export const JobCard: React.FC<JobCardProps> = ({ job, onPress, now }) => {
  const ticketStr = `#${String(job.ticket_number).padStart(3, '0')}`;
  const colorLabel = job.color_mode === 'color' ? 'Color' : 'B&W';
  const { text: timeText, color: timeColor } = getRelativeTime(job.created_at, now);

  return (
    <Stack
      backgroundColor={libraryColors.cardBackground}
      borderRadius={12}
      padding={14}
      borderWidth={1}
      borderColor={libraryColors.borderLight}
      pressStyle={{ backgroundColor: libraryColors.lightGray, scale: 0.99 }}
      onPress={() => onPress(job)}
      cursor="pointer"
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack flex={1} gap={3}>
          <XStack alignItems="center" gap={10}>
            <Text fontSize={22} fontWeight="700" color={libraryColors.primaryDark}>
              {ticketStr}
            </Text>
            <StatusBadge status={job.status as any} />
          </XStack>

          <Text fontSize={14} color={libraryColors.charcoal} numberOfLines={1} marginTop={2}>
            {job.original_filename}
          </Text>

          <XStack gap={8} marginTop={2} alignItems="center" flexWrap="wrap">
            <Text fontSize={13} color={libraryColors.mediumGray}>
              {job.page_count} pg · {colorLabel}
            </Text>
            {job.copies > 1 && (
              <Stack
                paddingHorizontal={8}
                paddingVertical={2}
                borderRadius={10}
                backgroundColor="#FFF3E0"
                borderWidth={1}
                borderColor="#F57C00"
              >
                <Text fontSize={12} fontWeight="700" color="#E65100">
                  ×{job.copies} copies
                </Text>
              </Stack>
            )}
          </XStack>
        </YStack>

        <YStack alignItems="flex-end" gap={3}>
          <Text fontSize={18} fontWeight="700" color={libraryColors.charcoal}>
            {formatCost(job.estimated_cost)}
          </Text>
          <Text fontSize={12} fontWeight="600" color={timeColor}>
            {timeText}
          </Text>
        </YStack>
      </XStack>
    </Stack>
  );
};
