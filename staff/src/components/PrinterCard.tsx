import React, { useState } from 'react';
import { YStack, XStack, Text, Stack } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { libraryColors } from '../theme/colors';

interface Printer {
  id: string;
  name: string;
  system_name: string | null;
  ipp_url: string | null;
  is_active: boolean;
  source: 'system' | 'manual';
}

interface PrinterCardProps {
  printer: Printer;
  onActivate: (id: string) => void;
  onTestPrint: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const PrinterCard: React.FC<PrinterCardProps> = ({
  printer,
  onActivate,
  onTestPrint,
  onRemove,
}) => {
  const [testing, setTesting] = useState(false);
  const isActive = printer.is_active;
  const isManual = printer.source === 'manual';
  const detail = printer.system_name || printer.ipp_url || '';

  const handleTest = async () => {
    setTesting(true);
    await onTestPrint(printer.id);
    setTesting(false);
  };

  return (
    <Stack
      padding={16}
      borderRadius={12}
      borderWidth={2}
      borderColor={isActive ? libraryColors.primary : libraryColors.border}
      backgroundColor={isActive ? libraryColors.primaryLight : libraryColors.white}
      pressStyle={!isActive ? { backgroundColor: libraryColors.lightGray, scale: 0.99 } : undefined}
      onPress={!isActive ? () => onActivate(printer.id) : undefined}
      cursor={!isActive ? 'pointer' : 'default'}
    >
      {/* Header row */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap={8} flex={1}>
          {isActive && (
            <Stack
              width={24}
              height={24}
              borderRadius={12}
              backgroundColor={libraryColors.primary}
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons name="checkmark" size={16} color={libraryColors.white} />
            </Stack>
          )}
          <Text fontSize={17} fontWeight="700" color={libraryColors.charcoal} numberOfLines={1} flex={1}>
            {printer.name}
          </Text>
        </XStack>

        <Stack
          paddingHorizontal={10}
          paddingVertical={4}
          borderRadius={12}
          backgroundColor={isManual ? libraryColors.infoLight : libraryColors.lightGray}
        >
          <Text
            fontSize={11}
            fontWeight="600"
            color={isManual ? libraryColors.info : libraryColors.mediumGray}
          >
            {isManual ? 'Network' : 'System'}
          </Text>
        </Stack>
      </XStack>

      {/* Detail */}
      {detail ? (
        <Text fontSize={13} color={libraryColors.mediumGray} marginTop={4} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}

      {/* Active label */}
      {isActive && (
        <Text fontSize={13} fontWeight="600" color={libraryColors.primaryDark} marginTop={6}>
          Active — all jobs print here
        </Text>
      )}

      {/* Actions */}
      <XStack gap={8} marginTop={10}>
        {!isActive && (
          <ActionBtn
            label="Activate"
            bg={libraryColors.primary}
            color={libraryColors.white}
            onPress={() => onActivate(printer.id)}
          />
        )}
        <ActionBtn
          label={testing ? '...' : 'Test Print'}
          bg={libraryColors.lightGray}
          color={libraryColors.charcoal}
          onPress={handleTest}
          disabled={testing}
        />
        {isManual && onRemove && (
          <Stack
            paddingHorizontal={12}
            paddingVertical={8}
            pressStyle={{ opacity: 0.6 }}
            onPress={() => onRemove(printer.id)}
            cursor="pointer"
          >
            <Text fontSize={13} color={libraryColors.error}>Remove</Text>
          </Stack>
        )}
      </XStack>
    </Stack>
  );
};

const ActionBtn = ({
  label, bg, color, onPress, disabled,
}: { label: string; bg: string; color: string; onPress: () => void; disabled?: boolean }) => (
  <Stack
    paddingHorizontal={14}
    paddingVertical={8}
    borderRadius={8}
    backgroundColor={disabled ? libraryColors.border : bg}
    pressStyle={{ opacity: 0.8, scale: 0.97 }}
    onPress={disabled ? undefined : onPress}
    cursor={disabled ? 'default' : 'pointer'}
  >
    <Text fontSize={13} fontWeight="600" color={disabled ? libraryColors.mediumGray : color}>
      {label}
    </Text>
  </Stack>
);
