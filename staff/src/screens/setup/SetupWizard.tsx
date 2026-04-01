import React, { useState } from 'react';
import { ServerConnectStep } from './ServerConnectStep';
import { PrinterSetupStep } from './PrinterSetupStep';
import { PricingStep } from './PricingStep';
import { PinSetupStep } from './PinSetupStep';
import { useSetupStore } from '../../store/setupStore';
import { staffApi } from '../../services/api';

type WizardStep = 'server' | 'printer' | 'pricing' | 'pin';
const STEPS: WizardStep[] = ['server', 'printer', 'pricing', 'pin'];

export const SetupWizard = ({ onComplete }: { onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('server');
  const { completeSetup, serverUrl } = useSetupStore();

  const stepIndex = STEPS.indexOf(currentStep);

  const goNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    } else {
      handleFinish();
    }
  };

  const goBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleFinish = async () => {
    await completeSetup(serverUrl);
    onComplete();
  };

  switch (currentStep) {
    case 'server':
      return <ServerConnectStep onNext={goNext} />;
    case 'printer':
      return <PrinterSetupStep onNext={goNext} onBack={goBack} />;
    case 'pricing':
      return <PricingStep onNext={goNext} onBack={goBack} />;
    case 'pin':
      return <PinSetupStep onNext={goNext} onBack={goBack} />;
    default:
      return null;
  }
};
