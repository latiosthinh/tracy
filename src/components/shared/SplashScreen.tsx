import React, { useState, useEffect } from 'react';
import { Loader2, Database, FolderOpen, FileCode, CheckCircle2 } from 'lucide-react';

interface LoadingStep {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const LOADING_STEPS: LoadingStep[] = [
  { id: 'init', label: 'Initializing Tracy Engine...', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  { id: 'projects', label: 'Loading projects from disk...', icon: <FolderOpen className="w-4 h-4" /> },
  { id: 'flows', label: 'Loading flow definitions...', icon: <FileCode className="w-4 h-4" /> },
  { id: 'snapshots', label: 'Loading DOM snapshots...', icon: <Database className="w-4 h-4" /> },
  { id: 'ready', label: 'Ready', icon: <CheckCircle2 className="w-4 h-4" /> },
];

interface SplashScreenProps {
  isLoading: boolean;
  currentStep?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isLoading, currentStep = 'init' }) => {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isLoading) return;

    const stepIndex = LOADING_STEPS.findIndex(s => s.id === currentStep);
    const targetProgress = Math.min(((stepIndex + 1) / LOADING_STEPS.length) * 100, 95);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= targetProgress) return prev;
        return prev + 1;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isLoading, currentStep]);

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  const currentStepIndex = LOADING_STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-950 flex items-center justify-center select-none">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950" />

      {/* Animated grid pattern */}
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
            {/* Outer glow */}
            <div className="absolute inset-0 w-24 h-24 rounded-2xl bg-amber-500/20 blur-xl animate-pulse" />

            {/* Logo container */}
            <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-stone-900 p-1 flex items-center justify-center border border-amber-400/60 shadow-2xl shadow-amber-900/40">
              <div className="w-full h-full bg-stone-950 rounded-xl flex items-center justify-center relative overflow-hidden">
                <span className="font-display font-black text-amber-300 text-4xl tracking-tight">T</span>
                <span className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/60" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="font-display font-black text-amber-100 text-3xl tracking-wide">
              Tracy
            </h1>
            <p className="text-[11px] font-mono font-bold text-amber-500/90 tracking-[0.3em] uppercase mt-1">
              Agentic E2E Automation Studio
            </p>
          </div>
        </div>

        {/* Loading Steps */}
        <div className="w-full bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4 backdrop-blur-sm">
          {/* Progress Bar */}
          <div className="w-full bg-stone-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Steps List */}
          <div className="space-y-2">
            {LOADING_STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isComplete = index < currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`flex items-center space-x-3 text-xs transition-all duration-300 ${
                    isActive
                      ? 'text-amber-300'
                      : isComplete
                      ? 'text-emerald-400'
                      : 'text-stone-600'
                  }`}
                >
                  <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${
                    isComplete ? 'text-emerald-400' : isActive ? 'text-amber-400' : 'text-stone-700'
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isActive ? (
                      step.icon
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-stone-700" />
                    )}
                  </div>
                  <span className={`font-mono ${isActive ? 'font-bold' : ''}`}>
                    {step.label}
                    {isActive && <span className="inline-block w-6">{dots}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-[10px] text-stone-600 font-mono">
            v1.0.0 • Tauri 2 • Chromium Engine
          </p>
          <p className="text-[10px] text-stone-700">
            Loading your workspace{dots}
          </p>
        </div>
      </div>
    </div>
  );
};
