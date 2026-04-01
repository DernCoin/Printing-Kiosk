import React from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { libraryColors } from '../theme/colors';

interface PriceEditorProps {
  bwCents: number;
  colorCents: number;
  onBwChange: (cents: number) => void;
  onColorChange: (cents: number) => void;
}

export const PriceEditor: React.FC<PriceEditorProps> = ({
  bwCents,
  colorCents,
  onBwChange,
  onColorChange,
}) => {
  const handleChange = (text: string, setter: (cents: number) => void) => {
    // Accept dollar format like "0.10" or raw cents like "10"
    const cleaned = text.replace(/[^0-9.]/g, '');
    if (cleaned.includes('.')) {
      const dollars = parseFloat(cleaned);
      if (!isNaN(dollars)) setter(Math.round(dollars * 100));
    } else {
      const cents = parseInt(cleaned, 10);
      if (!isNaN(cents)) setter(cents);
    }
  };

  const formatForDisplay = (cents: number) => (cents / 100).toFixed(2);

  return (
    <YStack gap={16}>
      <YStack gap={8}>
        <Text fontSize={16} fontWeight="600" color={libraryColors.charcoal}>
          Black & White (per page)
        </Text>
        <XStack alignItems="center" gap={8}>
          <Text fontSize={20} fontWeight="600" color={libraryColors.charcoal}>$</Text>
          <Input
            value={formatForDisplay(bwCents)}
            onChangeText={(text) => handleChange(text, onBwChange)}
            keyboardType="decimal-pad"
            fontSize={20}
            fontWeight="600"
            height={48}
            flex={1}
            borderRadius={8}
            borderColor={libraryColors.border}
            borderWidth={2}
            paddingHorizontal={12}
            textAlign="left"
          />
        </XStack>
      </YStack>

      <YStack gap={8}>
        <Text fontSize={16} fontWeight="600" color={libraryColors.charcoal}>
          Color (per page)
        </Text>
        <XStack alignItems="center" gap={8}>
          <Text fontSize={20} fontWeight="600" color={libraryColors.charcoal}>$</Text>
          <Input
            value={formatForDisplay(colorCents)}
            onChangeText={(text) => handleChange(text, onColorChange)}
            keyboardType="decimal-pad"
            fontSize={20}
            fontWeight="600"
            height={48}
            flex={1}
            borderRadius={8}
            borderColor={libraryColors.border}
            borderWidth={2}
            paddingHorizontal={12}
            textAlign="left"
          />
        </XStack>
      </YStack>

      <YStack
        padding={12}
        backgroundColor={libraryColors.primaryLight}
        borderRadius={8}
      >
        <Text fontSize={14} color={libraryColors.primaryDark}>
          Example: A 5-page B&W document with 2 copies = ${((bwCents * 5 * 2) / 100).toFixed(2)}
        </Text>
      </YStack>
    </YStack>
  );
};
