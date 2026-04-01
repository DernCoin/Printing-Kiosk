import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { TamaguiProvider } from 'tamagui';
import { ActivityIndicator, View } from 'react-native';
import * as Font from 'expo-font';
import { config } from './tamagui.config';
import { StaffNavigator } from './src/navigation/StaffNavigator';
import { SetupWizard } from './src/screens/setup/SetupWizard';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { WebLayoutWrapper } from './src/components/WebLayoutWrapper';
import { useSetupStore } from './src/store/setupStore';
import { useSettingsStore } from './src/store/settingsStore';
import { staffSocket } from './src/services/socket';
import { staffApi } from './src/services/api';
import { isWeb } from './src/utils/platform';
import { libraryColors } from './src/theme/colors';

export default function App() {
  const { isSetupComplete, isLoaded, loadSetup } = useSetupStore();
  const { setSettings } = useSettingsStore();
  const [showSetup, setShowSetup] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load fonts
  useEffect(() => {
    Font.loadAsync({
      GoogleSansFlex_400Regular: require('./assets/fonts/GoogleSansFlex_400Regular.ttf'),
      GoogleSansFlex_700Bold: require('./assets/fonts/GoogleSansFlex_700Bold.ttf'),
    }).then(() => setFontsLoaded(true));
  }, []);

  // Load setup state on mount
  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  // Connect socket and load settings after setup
  useEffect(() => {
    if (isSetupComplete) {
      staffSocket.connect();
      staffApi.getSettings()
        .then(({ settings }) => setSettings(settings))
        .catch((err) => console.error('[App] Failed to load settings:', err));
    }
    return () => {
      staffSocket.disconnect();
    };
  }, [isSetupComplete, setSettings]);

  // Determine if we should show setup wizard
  useEffect(() => {
    if (isLoaded) {
      setShowSetup(!isSetupComplete);
    }
  }, [isLoaded, isSetupComplete]);

  // Loading screen
  if (!isLoaded || !fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: libraryColors.white }}>
          <ActivityIndicator size="large" color={libraryColors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  const webContainerStyle = isWeb ? {
    height: '100%' as any,
    maxHeight: '100%' as any,
    overflow: 'hidden' as const,
    display: 'flex' as const,
    flexDirection: 'column' as const,
  } : { flex: 1 };

  const handleSetupComplete = () => {
    setShowSetup(false);
    // Connect socket now that setup is done
    staffSocket.connect();
    staffApi.getSettings()
      .then(({ settings }) => setSettings(settings))
      .catch(() => {});
  };

  const content = showSetup ? (
    <SetupWizard onComplete={handleSetupComplete} />
  ) : (
    <NavigationContainer>
      <StaffNavigator />
    </NavigationContainer>
  );

  return (
    <ErrorBoundary>
      <TamaguiProvider config={config} defaultTheme="light">
        <SafeAreaProvider style={webContainerStyle}>
          <GestureHandlerRootView style={{ flex: 1, minHeight: 0, overflow: 'hidden' as any }}>
            {isWeb ? (
              <WebLayoutWrapper>
                {content}
              </WebLayoutWrapper>
            ) : (
              content
            )}
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </TamaguiProvider>
    </ErrorBoundary>
  );
}
