import React, { useEffect, useState, useCallback } from 'react';
import { YStack, XStack, Text, ScrollView, Stack } from 'tamagui';
import { RefreshControl } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { LibraryHeader } from '../components/LibraryHeader';
import { StatusBadge } from '../components/StatusBadge';
import { libraryColors } from '../theme/colors';
import { staffApi } from '../services/api';

interface HistoryJob {
  id: string;
  ticket_number: number;
  status: string;
  page_count: number;
  estimated_cost: number;
  color_mode: string;
  copies: number;
  source: string;
  original_filename: string;
  created_at: string;
  completed_at: string | null;
}

type DateFilter = 'today' | 'week' | 'month' | 'all';

export const HistoryScreen = () => {
  const [history, setHistory] = useState<HistoryJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<DateFilter>('today');

  const fetchHistory = useCallback(async () => {
    try {
      const response = await staffApi.getJobHistory(200, 0);
      setHistory(response.jobs);
    } catch (error) {
      console.error('[History] Failed to fetch:', error);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  // Filter by date
  const now = new Date();
  const filteredHistory = history.filter((job) => {
    const jobDate = new Date(job.created_at);
    switch (filter) {
      case 'today':
        return jobDate.toDateString() === now.toDateString();
      case 'week': {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return jobDate >= weekAgo;
      }
      case 'month': {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return jobDate >= monthAgo;
      }
      default:
        return true;
    }
  });

  // Revenue calculation
  const completedJobs = filteredHistory.filter((j) => j.status === 'completed');
  const totalRevenue = completedJobs.reduce((sum, j) => sum + j.estimated_cost, 0);
  const totalJobs = completedJobs.length;

  return (
    <ScreenContainer>
      <LibraryHeader title="History" />

      {/* Revenue summary */}
      <YStack
        padding={16}
        backgroundColor={libraryColors.primaryLight}
        flexDirection="row"
        justifyContent="space-around"
      >
        <YStack alignItems="center">
          <Text fontSize={28} fontWeight="700" color={libraryColors.primaryDark}>
            ${(totalRevenue / 100).toFixed(2)}
          </Text>
          <Text fontSize={13} color={libraryColors.primaryDark}>
            Revenue
          </Text>
        </YStack>
        <YStack alignItems="center">
          <Text fontSize={28} fontWeight="700" color={libraryColors.primaryDark}>
            {totalJobs}
          </Text>
          <Text fontSize={13} color={libraryColors.primaryDark}>
            Jobs Printed
          </Text>
        </YStack>
      </YStack>

      {/* Date filter */}
      <XStack padding={12} gap={8} justifyContent="center">
        {(['today', 'week', 'month', 'all'] as DateFilter[]).map((f) => (
          <Stack
            key={f}
            paddingHorizontal={16}
            paddingVertical={8}
            borderRadius={20}
            backgroundColor={filter === f ? libraryColors.primary : libraryColors.lightGray}
            pressStyle={{ opacity: 0.8 }}
            onPress={() => setFilter(f)}
            cursor="pointer"
          >
            <Text
              fontSize={13}
              fontWeight="600"
              color={filter === f ? libraryColors.white : libraryColors.mediumGray}
              textTransform="capitalize"
            >
              {f === 'all' ? 'All Time' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'Today'}
            </Text>
          </Stack>
        ))}
      </XStack>

      <ScrollView
        flex={1}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[libraryColors.primary]} />
        }
      >
        {filteredHistory.length === 0 ? (
          <YStack alignItems="center" paddingTop={60}>
            <Text fontSize={18} color={libraryColors.mediumGray}>No jobs in this period</Text>
          </YStack>
        ) : (
          filteredHistory.map((job) => (
            <XStack
              key={job.id}
              padding={12}
              backgroundColor={libraryColors.cardBackground}
              borderRadius={10}
              borderWidth={1}
              borderColor={libraryColors.borderLight}
              justifyContent="space-between"
              alignItems="center"
            >
              <YStack flex={1} gap={2}>
                <XStack alignItems="center" gap={8}>
                  <Text fontSize={16} fontWeight="700" color={libraryColors.charcoal}>
                    #{String(job.ticket_number).padStart(3, '0')}
                  </Text>
                  <StatusBadge status={job.status as any} />
                </XStack>
                <Text fontSize={13} color={libraryColors.mediumGray} numberOfLines={1}>
                  {job.original_filename} · {job.page_count}pg · {job.color_mode === 'color' ? 'Color' : 'B&W'}
                </Text>
              </YStack>
              <YStack alignItems="flex-end">
                <Text fontSize={16} fontWeight="600" color={libraryColors.charcoal}>
                  ${(job.estimated_cost / 100).toFixed(2)}
                </Text>
                <Text fontSize={11} color={libraryColors.mediumGray}>
                  {new Date(job.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
              </YStack>
            </XStack>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
};
