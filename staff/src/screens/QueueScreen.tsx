import React, { useEffect, useCallback, useState } from 'react';
import { YStack, Text, ScrollView } from 'tamagui';
import { RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { LibraryHeader } from '../components/LibraryHeader';
import { JobCard } from '../components/JobCard';
import { NewJobAlert } from '../components/NewJobAlert';
import { libraryColors } from '../theme/colors';
import { useQueueStore } from '../store/queueStore';
import { staffApi } from '../services/api';

export const QueueScreen = ({ navigation }: any) => {
  const { jobs, newJobTicket, setJobs, setLoading, setNewJobTicket, setSelectedJob } = useQueueStore();
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await staffApi.getJobs();
      setJobs(response.jobs);
    } catch (error) {
      console.error('[Queue] Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [setJobs, setLoading]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Tick every 30 seconds to update relative times
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const handleJobPress = (job: any) => {
    setSelectedJob(job.id);
    navigation.navigate('JobDetail', { jobId: job.id });
  };

  const activeJobs = jobs
    .filter((j) => ['waiting', 'reviewing', 'printing'].includes(j.status))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const jobCountText = activeJobs.length === 0
    ? 'No jobs'
    : activeJobs.length === 1
      ? '1 job'
      : `${activeJobs.length} jobs`;

  return (
    <ScreenContainer>
      <LibraryHeader
        title="Print Queue"
        rightText={jobCountText}
        rightColor={activeJobs.length > 0 ? libraryColors.primaryDark : libraryColors.mediumGray}
      />

      <NewJobAlert
        ticketNumber={newJobTicket}
        visible={newJobTicket !== null}
        onDismiss={() => setNewJobTicket(null)}
      />

      <ScrollView
        flex={1}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[libraryColors.primary]} />
        }
      >
        {activeJobs.length === 0 ? (
          <YStack flex={1} alignItems="center" justifyContent="center" paddingTop={80}>
            <Ionicons name="print-outline" size={48} color={libraryColors.mediumGray} style={{ marginBottom: 16 }} />
            <Text fontSize={20} fontWeight="600" color={libraryColors.charcoal}>
              No print jobs right now
            </Text>
            <Text fontSize={15} color={libraryColors.mediumGray} marginTop={8}>
              New jobs will appear here automatically
            </Text>
          </YStack>
        ) : (
          activeJobs.map((job) => (
            <JobCard key={job.id} job={job} onPress={handleJobPress} now={now} />
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
};
