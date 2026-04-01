import React, { useState } from 'react';
import { YStack, Text, Input, Stack, XStack } from 'tamagui';
import { ScreenContainer } from '../../components/ScreenContainer';
import { libraryColors } from '../../theme/colors';
import { staffApi } from '../../services/api';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export const PinSetupStep: React.FC<Props> = ({ onNext, onBack }) => {
  const [staffPin, setStaffPin] = useState('');
  const [kioskPin, setKioskPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    try {
      setError(null);
      await staffApi.updateSettings({
        staff_pin: staffPin,
        kiosk_pin: kioskPin,
      });
      onNext(); // This triggers setup completion
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <ScreenContainer>
      <YStack flex={1} padding={32} justifyContent="center" alignItems="center" gap={32}>
        <YStack alignItems="center" gap={8}>
          <Text fontSize={26} fontWeight="700" color={libraryColors.charcoal} textAlign="center">
            Set Up PINs
          </Text>
          <Text fontSize={16} color={libraryColors.mediumGray} textAlign="center">
            These are optional but recommended. You can change them later in Settings.
          </Text>
        </YStack>

        <YStack width="100%" maxWidth={400} gap={24}>
          <YStack gap={8}>
            <Text fontSize={16} fontWeight="600" color={libraryColors.charcoal}>
              Staff PIN
            </Text>
            <Text fontSize={14} color={libraryColors.mediumGray}>
              Protects settings and staff-only actions.
            </Text>
            <Input
              value={staffPin}
              onChangeText={setStaffPin}
              placeholder="e.g., 1234"
              keyboardType="number-pad"
              secureTextEntry
              fontSize={24}
              fontWeight="600"
              height={52}
              borderRadius={10}
              borderColor={libraryColors.border}
              borderWidth={2}
              textAlign="center"
              maxLength={6}
              letterSpacing={8}
            />
          </YStack>

          <YStack gap={8}>
            <Text fontSize={16} fontWeight="600" color={libraryColors.charcoal}>
              Kiosk Exit PIN
            </Text>
            <Text fontSize={14} color={libraryColors.mediumGray}>
              Required to exit kiosk fullscreen mode on the patron device.
            </Text>
            <Input
              value={kioskPin}
              onChangeText={setKioskPin}
              placeholder="e.g., 5678"
              keyboardType="number-pad"
              secureTextEntry
              fontSize={24}
              fontWeight="600"
              height={52}
              borderRadius={10}
              borderColor={libraryColors.border}
              borderWidth={2}
              textAlign="center"
              maxLength={6}
              letterSpacing={8}
            />
          </YStack>

          {error && (
            <Text fontSize={14} color={libraryColors.error} textAlign="center">
              {error}
            </Text>
          )}

          <XStack gap={12} marginTop={8}>
            <Stack
              flex={1}
              paddingVertical={14}
              backgroundColor={libraryColors.lightGray}
              borderRadius={10}
              alignItems="center"
              pressStyle={{ backgroundColor: libraryColors.border }}
              onPress={onBack}
              cursor="pointer"
            >
              <Text fontSize={16} fontWeight="600" color={libraryColors.charcoal}>Back</Text>
            </Stack>
            <Stack
              flex={2}
              paddingVertical={14}
              backgroundColor={libraryColors.primary}
              borderRadius={10}
              alignItems="center"
              pressStyle={{ backgroundColor: libraryColors.primaryDark, scale: 0.98 }}
              onPress={handleFinish}
              cursor="pointer"
            >
              <Text fontSize={16} fontWeight="600" color={libraryColors.white}>Finish Setup</Text>
            </Stack>
          </XStack>

          <Stack
            paddingVertical={10}
            alignItems="center"
            pressStyle={{ opacity: 0.7 }}
            onPress={handleFinish}
            cursor="pointer"
          >
            <Text fontSize={14} color={libraryColors.mediumGray}>
              Skip — set up PINs later
            </Text>
          </Stack>
        </YStack>
      </YStack>
    </ScreenContainer>
  );
};
