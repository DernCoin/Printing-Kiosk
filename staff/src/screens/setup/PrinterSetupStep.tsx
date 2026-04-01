import React, { useState, useEffect, useCallback } from 'react';
import { YStack, Text, Input, Stack, XStack, ScrollView } from 'tamagui';
import { ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PrinterCard } from '../../components/PrinterCard';
import { libraryColors } from '../../theme/colors';
import { staffApi } from '../../services/api';

interface Printer {
  id: string;
  name: string;
  system_name: string | null;
  ipp_url: string | null;
  is_active: boolean;
  source: 'system' | 'manual';
}

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export const PrinterSetupStep: React.FC<Props> = ({ onNext, onBack }) => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [systemAvailable, setSystemAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addUrl, setAddUrl] = useState('');

  const loadPrinters = useCallback(async () => {
    try {
      setLoading(true);
      const result = await staffApi.listPrinters();
      setPrinters(result.printers);
      setSystemAvailable(result.systemAvailable);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPrinters(); }, [loadPrinters]);

  const hasActive = printers.some((p) => p.is_active);

  const handleActivate = async (id: string) => {
    try {
      await staffApi.activatePrinter(id);
      await loadPrinters();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleTestPrint = async (id: string) => {
    try {
      setMessage('Sending test page...');
      const result = await staffApi.testPrinter(id);
      setMessage(result.message);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await staffApi.removePrinter(id);
      await loadPrinters();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleAdd = async () => {
    if (!addName.trim() || !addUrl.trim()) return;
    try {
      await staffApi.addPrinter(addName.trim(), addUrl.trim());
      await loadPrinters();
      setShowAdd(false);
      setAddName('');
      setAddUrl('');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView flex={1} contentContainerStyle={{ padding: 32, paddingBottom: 60 }}>
        <YStack alignItems="center" gap={8} marginBottom={24}>
          <Text fontSize={26} fontWeight="700" color={libraryColors.charcoal} textAlign="center">
            Select a Printer
          </Text>
          <Text fontSize={16} color={libraryColors.mediumGray} textAlign="center">
            Choose which printer to use for print jobs. You can change this later in Settings.
          </Text>
        </YStack>

        {message && (
          <Stack padding={10} backgroundColor={message.startsWith('Error') ? libraryColors.errorLight : libraryColors.primaryLight} borderRadius={8} marginBottom={16}>
            <Text fontSize={14} color={message.startsWith('Error') ? libraryColors.error : libraryColors.primaryDark} textAlign="center">
              {message}
            </Text>
          </Stack>
        )}

        {loading ? (
          <YStack alignItems="center" paddingTop={40} gap={12}>
            <ActivityIndicator size="large" color={libraryColors.primary} />
            <Text fontSize={16} color={libraryColors.mediumGray}>Discovering printers...</Text>
          </YStack>
        ) : (
          <YStack gap={10} width="100%" maxWidth={500} alignSelf="center">
            {printers.length === 0 && (
              <YStack padding={20} backgroundColor={libraryColors.warningLight} borderRadius={12} gap={8}>
                <Text fontSize={16} fontWeight="600" color={libraryColors.warning}>
                  No Printers Found
                </Text>
                <Text fontSize={14} color={libraryColors.charcoal}>
                  {systemAvailable
                    ? 'Connect a USB printer to this computer, or add a network printer below.'
                    : 'The print system (CUPS) is not installed. Install CUPS and connect a printer, or add a network printer by its IPP address.'}
                </Text>
              </YStack>
            )}

            {printers.map((p) => (
              <PrinterCard
                key={p.id}
                printer={p}
                onActivate={handleActivate}
                onTestPrint={handleTestPrint}
                onRemove={p.source === 'manual' ? handleRemove : undefined}
              />
            ))}

            {/* Add network printer */}
            {showAdd ? (
              <YStack padding={16} backgroundColor={libraryColors.lightGray} borderRadius={12} gap={12}>
                <Text fontSize={15} fontWeight="600" color={libraryColors.charcoal}>Add Network Printer</Text>
                <Input
                  value={addName}
                  onChangeText={setAddName}
                  placeholder="Name (e.g., Staff Room HP)"
                  fontSize={15} height={44} borderRadius={8} borderColor={libraryColors.border} borderWidth={1} paddingHorizontal={12} backgroundColor={libraryColors.white}
                />
                <Input
                  value={addUrl}
                  onChangeText={setAddUrl}
                  placeholder="IPP URL (e.g., ipp://192.168.1.50/ipp/print)"
                  fontSize={15} height={44} borderRadius={8} borderColor={libraryColors.border} borderWidth={1} paddingHorizontal={12} autoCapitalize="none" backgroundColor={libraryColors.white}
                />
                <XStack gap={8}>
                  <Stack flex={1} paddingVertical={10} borderRadius={8} backgroundColor={libraryColors.primary} alignItems="center" pressStyle={{ backgroundColor: libraryColors.primaryDark }} onPress={handleAdd} cursor="pointer" opacity={addName.trim() && addUrl.trim() ? 1 : 0.5}>
                    <Text fontSize={14} fontWeight="600" color={libraryColors.white}>Add</Text>
                  </Stack>
                  <Stack flex={1} paddingVertical={10} borderRadius={8} backgroundColor={libraryColors.white} borderWidth={1} borderColor={libraryColors.border} alignItems="center" pressStyle={{ backgroundColor: libraryColors.lightGray }} onPress={() => { setShowAdd(false); setAddName(''); setAddUrl(''); }} cursor="pointer">
                    <Text fontSize={14} fontWeight="600" color={libraryColors.charcoal}>Cancel</Text>
                  </Stack>
                </XStack>
              </YStack>
            ) : (
              <Stack paddingVertical={12} borderRadius={8} borderWidth={1} borderColor={libraryColors.border} borderStyle="dashed" alignItems="center" pressStyle={{ backgroundColor: libraryColors.lightGray }} onPress={() => setShowAdd(true)} cursor="pointer">
                <Text fontSize={14} fontWeight="600" color={libraryColors.mediumGray}>+ Add Network Printer</Text>
              </Stack>
            )}

            <Stack paddingVertical={10} alignItems="center" pressStyle={{ opacity: 0.7 }} onPress={loadPrinters} cursor="pointer">
              <Text fontSize={13} color={libraryColors.primary} fontWeight="600">Refresh Printer List</Text>
            </Stack>
          </YStack>
        )}

        {/* Navigation */}
        <XStack gap={12} marginTop={24} maxWidth={500} alignSelf="center" width="100%">
          <Stack flex={1} paddingVertical={14} backgroundColor={libraryColors.lightGray} borderRadius={10} alignItems="center" pressStyle={{ backgroundColor: libraryColors.border }} onPress={onBack} cursor="pointer">
            <Text fontSize={16} fontWeight="600" color={libraryColors.charcoal}>Back</Text>
          </Stack>
          <Stack
            flex={2} paddingVertical={14} borderRadius={10} alignItems="center"
            backgroundColor={hasActive ? libraryColors.primary : libraryColors.border}
            pressStyle={hasActive ? { backgroundColor: libraryColors.primaryDark, scale: 0.98 } : {}}
            onPress={hasActive ? onNext : undefined}
            cursor={hasActive ? 'pointer' : 'not-allowed'}
            opacity={hasActive ? 1 : 0.5}
          >
            <Text fontSize={16} fontWeight="600" color={libraryColors.white}>
              {hasActive ? 'Continue' : 'Select a Printer First'}
            </Text>
          </Stack>
        </XStack>
      </ScrollView>
    </ScreenContainer>
  );
};
