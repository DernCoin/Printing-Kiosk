import React, { useEffect, useState } from 'react';
import { XStack, Text, Stack } from 'tamagui';
import { Animated } from 'react-native';
import { libraryColors } from '../theme/colors';

interface NewJobAlertProps {
  ticketNumber: number | null;
  visible: boolean;
  onDismiss: () => void;
}

export const NewJobAlert: React.FC<NewJobAlertProps> = ({
  ticketNumber,
  visible,
  onDismiss,
}) => {
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      const timeout = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onDismiss());
      }, 4000);

      return () => clearTimeout(timeout);
    } else {
      slideAnim.setValue(-100);
    }
  }, [visible, ticketNumber]);

  if (!visible || ticketNumber === null) return null;

  const ticketStr = `#${String(ticketNumber).padStart(3, '0')}`;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <XStack
        backgroundColor={libraryColors.primary}
        padding={16}
        alignItems="center"
        justifyContent="center"
        gap={8}
      >
        <Text fontSize={16} fontWeight="700" color={libraryColors.white}>
          New Print Job
        </Text>
        <Text fontSize={20} fontWeight="700" color={libraryColors.white}>
          {ticketStr}
        </Text>
      </XStack>
    </Animated.View>
  );
};
