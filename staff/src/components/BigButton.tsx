import React from 'react';
import { Stack, Text } from 'tamagui';
import { libraryColors } from '../theme/colors';

interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const BigButton: React.FC<BigButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
  fullWidth = true,
}) => {
  const styles = {
    primary: {
      bg: libraryColors.primary,
      bgPress: libraryColors.primaryDark,
      text: libraryColors.white,
      border: 'transparent',
    },
    secondary: {
      bg: libraryColors.lightGray,
      bgPress: libraryColors.border,
      text: libraryColors.charcoal,
      border: libraryColors.border,
    },
    outline: {
      bg: libraryColors.white,
      bgPress: libraryColors.primaryLight,
      text: libraryColors.primary,
      border: libraryColors.primary,
    },
    danger: {
      bg: libraryColors.error,
      bgPress: '#B71C1C',
      text: libraryColors.white,
      border: 'transparent',
    },
  };

  const s = styles[variant];

  return (
    <Stack
      minHeight={72}
      paddingHorizontal={24}
      paddingVertical={16}
      backgroundColor={disabled ? libraryColors.border : s.bg}
      borderRadius={12}
      borderWidth={2}
      borderColor={disabled ? libraryColors.border : s.border}
      alignItems="center"
      justifyContent="center"
      flexDirection="row"
      gap={12}
      width={fullWidth ? '100%' : undefined}
      opacity={disabled ? 0.6 : 1}
      pressStyle={{
        backgroundColor: disabled ? libraryColors.border : s.bgPress,
        scale: disabled ? 1 : 0.98,
      }}
      onPress={disabled ? undefined : onPress}
      cursor={disabled ? 'not-allowed' : 'pointer'}
    >
      {icon}
      <Text
        fontSize={22}
        fontWeight="600"
        color={disabled ? libraryColors.mediumGray : s.text}
        textAlign="center"
      >
        {label}
      </Text>
    </Stack>
  );
};
