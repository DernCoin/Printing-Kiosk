import React from 'react';
import { XStack, Text } from 'tamagui';
import { Image } from 'react-native';
import { libraryColors } from '../theme/colors';

interface LibraryHeaderProps {
  title?: string;
  rightText?: string;
  rightColor?: string;
}

export const LibraryHeader: React.FC<LibraryHeaderProps> = ({ title, rightText, rightColor }) => {
  return (
    <XStack
      paddingVertical={8}
      paddingHorizontal={16}
      backgroundColor={libraryColors.white}
      alignItems="center"
      justifyContent="space-between"
      borderBottomWidth={2}
      borderBottomColor={libraryColors.primary}
    >
      <XStack alignItems="center" gap={10}>
        <Image
          source={require('../../assets/gibson-logo.png')}
          style={{ width: 40, height: 40 }}
          resizeMode="contain"
        />
        {title && (
          <Text fontSize={17} fontWeight="700" color={libraryColors.charcoal}>
            {title}
          </Text>
        )}
      </XStack>
      {rightText && (
        <Text fontSize={15} fontWeight="600" color={rightColor || libraryColors.mediumGray}>
          {rightText}
        </Text>
      )}
    </XStack>
  );
};
