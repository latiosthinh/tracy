import React, { useState, useEffect } from 'react';
import { Loader2, Database, FolderOpen, FileCode, CheckCircle2 } from 'lucide-react';
import { ProQALogo } from '@/src/components/shared/ProQALogo';
import { useTranslation } from '@/src/hooks/useTranslation';

interface SplashScreenProps {
  isLoading: boolean;
  onFinished?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isLoading, onFinished }) => {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(10);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [dots, setDots] = useState('');

  const loadingSteps = [
    { id: 'init', label: t('splash.initEngine'), icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    { id: 'projects', label: t('splash.loadProjects'), icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'flows', label: t('splash.loadFlows'), icon: <FileCode className="w-4 h-4" /> },
    { id: 'snapshots', label: t('splash.loadSnapshots'), icon: <Database className="w-4 h-4" /> },
    { id: 'ready', label: t('splash.ready'), icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  // Fast, smooth step progression (~160ms per step, ~800ms total)
  useEffect(() => {
    if (!isLoading && currentStepIndex === loadingSteps.length - 1) {
      return;
    }

    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < loadingSteps.length - 1) {
          const next = prev + 1;
          const nextProgress = Math.round(((next + 1) / loadingSteps.length) * 100);
          setProgress(nextProgress);
          return next;
        }
        return prev;
      });
    }, 160);

    return () => clearInterval(stepInterval);
  }, [isLoading, currentStepIndex, loadingSteps.length]);

  // Once all steps are complete and ready, trigger smooth fade out
  useEffect(() => {
    if (currentStepIndex === loadingSteps.length - 1 && !isLoading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        const exitTimer = setTimeout(() => {
          onFinished?.();
        }, 400);
        return () => clearTimeout(exitTimer);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, isLoading, loadingSteps.length, onFinished]);

  // Dots animation
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 300);
    return () => clearInterval(dotInterval);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-stone-950 flex items-center justify-center select-none transition-opacity duration-400 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950" />

      {/* Subtle animated grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(251, 191, 36, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center space-y-8 max-w-md w-full px-8">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {/* Outer warm glow */}
            <div className="absolute inset-0 w-24 h-24 rounded-2xl bg-amber-600/15 blur-xl" />
            <ProQALogo size="xl" />
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="font-serif font-bold text-amber-100 text-3xl tracking-wide">
              {t('splash.appName')}
            </h1>
            <p className="text-[11px] font-mono font-semibold text-amber-500/90 tracking-[0.3em] uppercase mt-1">
              {t('splash.appSubtitle')}
            </p>
          </div>
        </div>

        {/* Loading Steps */}
        <div className="w-full bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4 backdrop-blur-sm shadow-2xl">
          {/* Progress Bar */}
          <div className="w-full bg-stone-950 rounded-full h-1.5 overflow-hidden border border-stone-800/60">
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 transition-all duration-200 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Steps List */}
          <div className="space-y-2.5">
            {loadingSteps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isComplete = index < currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`flex items-center space-x-3 text-xs transition-colors duration-200 ${
                    isActive
                      ? 'text-amber-300 font-semibold'
                      : isComplete
                      ? 'text-emerald-400'
                      : 'text-stone-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 flex items-center justify-center shrink-0 ${
                      isComplete ? 'text-emerald-400' : isActive ? 'text-amber-400' : 'text-stone-700'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isActive ? (
                      step.icon
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-stone-800" />
                    )}
                  </div>
                  <span className="font-mono">
                    {step.label}
                    {isActive && index < loadingSteps.length - 1 && (
                      <span className="inline-block w-6 text-amber-400">{dots}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-[10px] text-stone-600 font-mono">
            {t('splash.versionInfo')}
          </p>
          <p className="text-[10px] text-stone-700">
            {t('splash.loadingWorkspace', { dots })}
          </p>
        </div>
      </div>
    </div>
  );
};
