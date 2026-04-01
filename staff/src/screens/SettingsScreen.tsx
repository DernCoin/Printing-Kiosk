import React, { useEffect, useState, useCallback } from 'react';
import { YStack, XStack, Text, ScrollView, Stack, Input } from 'tamagui';
import { ScreenContainer } from '../components/ScreenContainer';
import { LibraryHeader } from '../components/LibraryHeader';
import { PriceEditor } from '../components/PriceEditor';
import { PrinterCard } from '../components/PrinterCard';
import { libraryColors } from '../theme/colors';
import { useSettingsStore } from '../store/settingsStore';
import { staffApi } from '../services/api';

export const SettingsScreen = () => {
  const { settings, setSettings, updateSetting, printers, systemAvailable, setPrinters } = useSettingsStore();
  const [message, setMessage] = useState<string | null>(null);
  const [showAddPrinter, setShowAddPrinter] = useState(false);
  const [newPrinterName, setNewPrinterName] = useState('');
  const [newPrinterUrl, setNewPrinterUrl] = useState('');

  useEffect(() => {
    staffApi.getSettings().then(({ settings: s }) => setSettings(s)).catch(() => {});
    loadPrinters();
  }, []);

  const loadPrinters = useCallback(async () => {
    try {
      const result = await staffApi.listPrinters();
      setPrinters(result.printers, result.systemAvailable);
    } catch (err) {
      console.error('[Settings] Failed to load printers:', err);
    }
  }, [setPrinters]);

  const bwCents = parseInt(settings.pricing_bw_per_page || '10', 10);
  const colorCents = parseInt(settings.pricing_color_per_page || '25', 10);
  const timeoutMin = settings.job_timeout_minutes || '30';
  const dailyReset = settings.ticket_reset_daily === 'true';

  const saveSetting = async (key: string, value: string) => {
    try {
      setMessage(null);
      await staffApi.updateSetting(key, value);
      updateSetting(key, value);
      setMessage('Saved');
      setTimeout(() => setMessage(null), 2000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await staffApi.activatePrinter(id);
      await loadPrinters();
      setMessage('Printer activated');
      setTimeout(() => setMessage(null), 2000);
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

  const handleRemovePrinter = async (id: string) => {
    try {
      await staffApi.removePrinter(id);
      await loadPrinters();
      setMessage('Printer removed');
      setTimeout(() => setMessage(null), 2000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleAddPrinter = async () => {
    if (!newPrinterName.trim() || !newPrinterUrl.trim()) return;
    try {
      await staffApi.addPrinter(newPrinterName.trim(), newPrinterUrl.trim());
      await loadPrinters();
      setShowAddPrinter(false);
      setNewPrinterName('');
      setNewPrinterUrl('');
      setMessage('Printer added');
      setTimeout(() => setMessage(null), 2000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <ScreenContainer>
      <LibraryHeader title="Settings" />
      <ScrollView flex={1} contentContainerStyle={{ padding: 20, gap: 28, paddingBottom: 60 }}>
        {/* Status message */}
        {message && (
          <Stack
            padding={10}
            backgroundColor={message.startsWith('Error') ? libraryColors.errorLight : libraryColors.primaryLight}
            borderRadius={8}
          >
            <Text
              fontSize={14}
              color={message.startsWith('Error') ? libraryColors.error : libraryColors.primaryDark}
              textAlign="center"
            >
              {message}
            </Text>
          </Stack>
        )}

        {/* Server Address */}
        <Section title="Server Address">
          <YStack gap={8}>
            <Text fontSize={14} color={libraryColors.mediumGray}>
              The address phones use to reach this server. Leave empty to auto-detect your network IP.
            </Text>
            <Input
              value={settings.server_address || ''}
              onChangeText={(t) => updateSetting('server_address', t)}
              onBlur={() => saveSetting('server_address', settings.server_address || '')}
              placeholder="Auto-detect (recommended)"
              fontSize={15}
              height={44}
              borderRadius={8}
              borderColor={libraryColors.border}
              borderWidth={1}
              paddingHorizontal={12}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </YStack>
        </Section>

        {/* Pricing */}
        <Section title="Pricing">
          <PriceEditor
            bwCents={bwCents}
            colorCents={colorCents}
            onBwChange={(cents) => saveSetting('pricing_bw_per_page', String(cents))}
            onColorChange={(cents) => saveSetting('pricing_color_per_page', String(cents))}
          />
        </Section>

        {/* Printers */}
        <Section title="Printers">
          <YStack gap={10}>
            {printers.length === 0 && (
              <YStack padding={20} backgroundColor={libraryColors.warningLight} borderRadius={12} gap={8}>
                <Text fontSize={16} fontWeight="600" color={libraryColors.warning}>
                  No Printers Found
                </Text>
                <Text fontSize={14} color={libraryColors.charcoal}>
                  {systemAvailable
                    ? 'Connect a USB printer to the server or add a network printer below.'
                    : 'The print system (CUPS) is not installed on this server. Install CUPS, connect a printer, then refresh.'}
                </Text>
              </YStack>
            )}

            {printers.map((printer) => (
              <PrinterCard
                key={printer.id}
                printer={printer}
                onActivate={handleActivate}
                onTestPrint={handleTestPrint}
                onRemove={printer.source === 'manual' ? handleRemovePrinter : undefined}
              />
            ))}

            {/* Add network printer */}
            {showAddPrinter ? (
              <YStack padding={16} backgroundColor={libraryColors.lightGray} borderRadius={12} gap={12}>
                <Text fontSize={15} fontWeight="600" color={libraryColors.charcoal}>
                  Add Network Printer
                </Text>
                <Input
                  value={newPrinterName}
                  onChangeText={setNewPrinterName}
                  placeholder="Name (e.g., Staff Room HP)"
                  fontSize={15}
                  height={44}
                  borderRadius={8}
                  borderColor={libraryColors.border}
                  borderWidth={1}
                  paddingHorizontal={12}
                  backgroundColor={libraryColors.white}
                />
                <Input
                  value={newPrinterUrl}
                  onChangeText={setNewPrinterUrl}
                  placeholder="IPP URL (e.g., ipp://192.168.1.50/ipp/print)"
                  fontSize={15}
                  height={44}
                  borderRadius={8}
                  borderColor={libraryColors.border}
                  borderWidth={1}
                  paddingHorizontal={12}
                  autoCapitalize="none"
                  backgroundColor={libraryColors.white}
                />
                <XStack gap={8}>
                  <Stack
                    flex={1}
                    paddingVertical={10}
                    borderRadius={8}
                    backgroundColor={libraryColors.primary}
                    alignItems="center"
                    pressStyle={{ backgroundColor: libraryColors.primaryDark }}
                    onPress={handleAddPrinter}
                    cursor="pointer"
                    opacity={newPrinterName.trim() && newPrinterUrl.trim() ? 1 : 0.5}
                  >
                    <Text fontSize={14} fontWeight="600" color={libraryColors.white}>Add</Text>
                  </Stack>
                  <Stack
                    flex={1}
                    paddingVertical={10}
                    borderRadius={8}
                    backgroundColor={libraryColors.white}
                    borderWidth={1}
                    borderColor={libraryColors.border}
                    alignItems="center"
                    pressStyle={{ backgroundColor: libraryColors.lightGray }}
                    onPress={() => { setShowAddPrinter(false); setNewPrinterName(''); setNewPrinterUrl(''); }}
                    cursor="pointer"
                  >
                    <Text fontSize={14} fontWeight="600" color={libraryColors.charcoal}>Cancel</Text>
                  </Stack>
                </XStack>
              </YStack>
            ) : (
              <Stack
                paddingVertical={12}
                borderRadius={8}
                borderWidth={1}
                borderColor={libraryColors.border}
                borderStyle="dashed"
                alignItems="center"
                pressStyle={{ backgroundColor: libraryColors.lightGray }}
                onPress={() => setShowAddPrinter(true)}
                cursor="pointer"
              >
                <Text fontSize={14} fontWeight="600" color={libraryColors.mediumGray}>
                  + Add Network Printer
                </Text>
              </Stack>
            )}

            {/* Refresh button */}
            <Stack
              paddingVertical={10}
              alignItems="center"
              pressStyle={{ opacity: 0.7 }}
              onPress={loadPrinters}
              cursor="pointer"
            >
              <Text fontSize={13} color={libraryColors.primary} fontWeight="600">
                Refresh Printer List
              </Text>
            </Stack>
          </YStack>
        </Section>

        {/* Job timeout */}
        <Section title="Job Timeout">
          <YStack gap={8}>
            <Text fontSize={14} color={libraryColors.mediumGray}>
              Auto-delete unclaimed jobs after (minutes):
            </Text>
            <Input
              value={timeoutMin}
              onChangeText={(t) => updateSetting('job_timeout_minutes', t)}
              onBlur={() => saveSetting('job_timeout_minutes', settings.job_timeout_minutes || '30')}
              keyboardType="number-pad"
              fontSize={18}
              fontWeight="600"
              width={100}
              height={44}
              borderRadius={8}
              borderColor={libraryColors.border}
              borderWidth={1}
              textAlign="center"
            />
          </YStack>
        </Section>

        {/* Ticket reset */}
        <Section title="Ticket Numbers">
          <XStack alignItems="center" gap={12}>
            <Text fontSize={15} color={libraryColors.charcoal} flex={1}>
              Reset ticket numbers daily
            </Text>
            <Stack
              paddingHorizontal={16}
              paddingVertical={8}
              borderRadius={20}
              backgroundColor={dailyReset ? libraryColors.primary : libraryColors.lightGray}
              pressStyle={{ opacity: 0.8 }}
              onPress={() => saveSetting('ticket_reset_daily', dailyReset ? 'false' : 'true')}
              cursor="pointer"
            >
              <Text fontSize={14} fontWeight="600" color={dailyReset ? libraryColors.white : libraryColors.mediumGray}>
                {dailyReset ? 'On' : 'Off'}
              </Text>
            </Stack>
          </XStack>
        </Section>

        {/* Staff PIN */}
        <Section title="Staff PIN">
          <YStack gap={8}>
            <Text fontSize={14} color={libraryColors.mediumGray}>
              PIN for staff-only actions (leave empty to disable):
            </Text>
            <Input
              value={settings.staff_pin || ''}
              onChangeText={(t) => updateSetting('staff_pin', t)}
              onBlur={() => saveSetting('staff_pin', settings.staff_pin || '')}
              placeholder="e.g., 1234"
              keyboardType="number-pad"
              secureTextEntry
              fontSize={18}
              fontWeight="600"
              width={150}
              height={44}
              borderRadius={8}
              borderColor={libraryColors.border}
              borderWidth={1}
              textAlign="center"
            />
          </YStack>
        </Section>
      </ScrollView>
    </ScreenContainer>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <YStack gap={12}>
    <Text fontSize={18} fontWeight="700" color={libraryColors.charcoal}>
      {title}
    </Text>
    {children}
  </YStack>
);
