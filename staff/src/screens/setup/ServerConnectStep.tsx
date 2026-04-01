import React, { useState, useEffect } from 'react';
import { YStack, Text, Input, Stack } from 'tamagui';
import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BigButton } from '../../components/BigButton';
import { libraryColors } from '../../theme/colors';
import { useSetupStore } from '../../store/setupStore';

interface Props {
  onNext: () => void;
}

export const ServerConnectStep: React.FC<Props> = ({ onNext }) => {
  const { setServerUrl } = useSetupStore();
  const [manualUrl, setManualUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoChecking, setAutoChecking] = useState(true);

  // Try localhost first (dev mode)
  useEffect(() => {
    const tryLocalhost = async () => {
      try {
        const res = await fetch('http://localhost:3000/health', { signal: AbortSignal.timeout(2000) });
        const data = await res.json();
        if (data.service === 'print-kiosk') {
          await setServerUrl('http://localhost:3000');
          onNext();
          return;
        }
      } catch { /* not running locally */ }
      setAutoChecking(false);
    };
    tryLocalhost();
  }, []);

  const handleConnect = async (url: string) => {
    await setServerUrl(url);
    onNext();
  };

  const testManualUrl = async () => {
    let testUrl = manualUrl.trim();
    if (!testUrl) return;
    if (!testUrl.startsWith('http')) testUrl = `http://${testUrl}`;
    if (!testUrl.match(/:\d+$/)) testUrl = `${testUrl}:3000`;

    setTesting(true);
    setError(null);

    try {
      const response = await fetch(`${testUrl}/health`, { signal: AbortSignal.timeout(5000) });
      const data = await response.json();
      if (data.service === 'print-kiosk') {
        await handleConnect(testUrl);
      } else {
        setError('Server found but it is not a Print Kiosk server.');
      }
    } catch {
      setError('Could not connect. Check the address and try again.');
    } finally {
      setTesting(false);
    }
  };

  if (autoChecking) {
    return (
      <ScreenContainer>
        <YStack flex={1} justifyContent="center" alignItems="center" gap={16}>
          <ActivityIndicator size="large" color={libraryColors.primary} />
          <Text fontSize={18} color={libraryColors.charcoal}>Checking for server...</Text>
        </YStack>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <YStack flex={1} justifyContent="center" alignItems="center" padding={32} gap={32}>
        <YStack alignItems="center" gap={8}>
          <Text fontSize={26} fontWeight="700" color={libraryColors.charcoal} textAlign="center">
            Connect to Print Server
          </Text>
          <Text fontSize={15} color={libraryColors.mediumGray} textAlign="center">
            Enter the kiosk server address
          </Text>
        </YStack>

        <YStack gap={16} width="100%" maxWidth={400}>
          <Input
            value={manualUrl}
            onChangeText={setManualUrl}
            placeholder="e.g., 192.168.1.50"
            fontSize={18}
            height={52}
            borderRadius={10}
            borderColor={libraryColors.border}
            borderWidth={2}
            paddingHorizontal={14}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {error && (
            <Text fontSize={14} color={libraryColors.error} textAlign="center">{error}</Text>
          )}
          <BigButton
            label={testing ? 'Connecting...' : 'Connect'}
            onPress={testManualUrl}
            disabled={testing || !manualUrl.trim()}
          />
        </YStack>
      </YStack>
    </ScreenContainer>
  );
};
