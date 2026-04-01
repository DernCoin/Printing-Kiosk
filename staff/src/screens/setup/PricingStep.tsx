import React, { useState } from 'react';
import { YStack, Text, Stack, XStack } from 'tamagui';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PriceEditor } from '../../components/PriceEditor';
import { libraryColors } from '../../theme/colors';
import { staffApi } from '../../services/api';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export const PricingStep: React.FC<Props> = ({ onNext, onBack }) => {
  const [bwCents, setBwCents] = useState(10);
  const [colorCents, setColorCents] = useState(25);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setError(null);
      await staffApi.updateSettings({
        pricing_bw_per_page: String(bwCents),
        pricing_color_per_page: String(colorCents),
      });
      onNext();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <ScreenContainer>
      <YStack flex={1} padding={32} justifyContent="center" alignItems="center" gap={32}>
        <YStack alignItems="center" gap={8}>
          <Text fontSize={26} fontWeight="700" color={libraryColors.charcoal} textAlign="center">
            Set Your Prices
          </Text>
          <Text fontSize={16} color={libraryColors.mediumGray} textAlign="center">
            How much do you charge per page? You can change this later.
          </Text>
        </YStack>

        <YStack width="100%" maxWidth={400} gap={20}>
          <PriceEditor
            bwCents={bwCents}
            colorCents={colorCents}
            onBwChange={setBwCents}
            onColorChange={setColorCents}
          />

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
              onPress={handleSave}
              cursor="pointer"
            >
              <Text fontSize={16} fontWeight="600" color={libraryColors.white}>Continue</Text>
            </Stack>
          </XStack>
        </YStack>
      </YStack>
    </ScreenContainer>
  );
};
