import React, { useState } from 'react';
import { ChevronRight, ArrowLeft, Cloud, Download, Sparkles, FolderPlus, Globe, CheckCircle2 } from 'lucide-react';
import { useAgentStore } from '@/src/stores/agentStore';
import { useAiConfigStore } from '@/src/stores/aiConfigStore';
import { useProjectStore } from '@/src/stores/projectStore';
import { useUiStore } from '@/src/stores/uiStore';
import { AgentSelector } from '@/src/components/shared/AgentSelector';
import { ProQALogo } from '@/src/components/shared/ProQALogo';
import { useEnvironment } from '@/src/hooks/useEnvironment';
import { useTranslation } from '@/src/hooks/useTranslation';
import type { Project } from '@/src/types/project';
import type { FlowFile } from '@/src/types/flow';

export const WelcomeSetup: React.FC = () => {
  const { t } = useTranslation();
  const { isWeb } = useEnvironment();

  const [step, setStep] = useState<1 | 2>(1);

  // AI Store
  const detectedAgents = useAgentStore((s) => s.detectedAgents);
  const selectedAgentId = useAiConfigStore((s) => s.selectedAgentId);
  const selectAgent = useAiConfigStore((s) => s.selectAgent);

  // Project Store & UI Store
  const createProject = useProjectStore((s) => s.createProject);
  const setCurrentView = useUiStore((s) => s.setCurrentView);

  // Step 2 Form State
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEnv, setFormEnv] = useState<'local' | 'staging' | 'development' | 'production'>('local');
  const [formTemplate, setFormTemplate] = useState<'standard' | 'ecommerce' | 'auth' | 'blank'>('standard');
  const [formError, setFormError] = useState('');

  const handleNextToStep2 = () => {
    if (!selectedAgentId) return;
    selectAgent(selectedAgentId);
    setStep(2);
  };

  const handleFinishSetup = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      setFormError(t('setup.nameRequired'));
      return;
    }

    let formattedUrl = formUrl.trim();
    if (!formattedUrl) {
      setFormError(t('setup.urlRequired'));
      return;
    }

    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Build starter flows based on template
    let starterFlows: FlowFile[] = [];
    const timestamp = Date.now();

    if (formTemplate === 'ecommerce') {
      starterFlows = [
        {
          id: `flow-${timestamp}-1`,
          name: 'checkout-flow.yaml',
          path: 'flows/checkout-flow.yaml',
          category: 'E2E',
          tags: ['checkout', 'e2e'],
          metadata: { url: formattedUrl, browser: 'chromium' },
          yamlContent: `url: ${formattedUrl}\n---\n- navigate: /\n- leftClick: "Add to Cart"\n- leftClick: "Checkout"\n- assertVisible: "Order Confirmed!"`,
          steps: [
            { id: '1', command: 'navigate', value: '/', status: 'pending' },
            { id: '2', command: 'leftClick', target: 'Add to Cart', status: 'pending' },
            { id: '3', command: 'leftClick', target: 'Checkout', status: 'pending' },
            { id: '4', command: 'assertVisible', value: 'Order Confirmed!', status: 'pending' },
          ],
        },
      ];
    } else if (formTemplate === 'auth') {
      starterFlows = [
        {
          id: `flow-${timestamp}-2`,
          name: 'login-flow.yaml',
          path: 'flows/login-flow.yaml',
          category: 'Smoke',
          tags: ['auth', 'login'],
          metadata: { url: formattedUrl, browser: 'chromium' },
          yamlContent: `url: ${formattedUrl}\n---\n- navigate: /login\n- fill:\n    selector:\n      label: "Email"\n    text: "admin@example.com"\n- leftClick: "Sign In"\n- assertVisible: "Welcome"`,
          steps: [
            { id: '1', command: 'navigate', value: '/login', status: 'pending' },
            { id: '2', command: 'fill', target: { type: 'label', value: 'Email' }, value: 'admin@example.com', status: 'pending' },
            { id: '3', command: 'leftClick', target: 'Sign In', status: 'pending' },
            { id: '4', command: 'assertVisible', value: 'Welcome', status: 'pending' },
          ],
        },
      ];
    } else if (formTemplate === 'blank') {
      starterFlows = [
        {
          id: `flow-${timestamp}-3`,
          name: 'my-flow.yaml',
          path: 'flows/my-flow.yaml',
          category: 'Smoke',
          tags: ['smoke'],
          metadata: { url: formattedUrl, browser: 'chromium' },
          yamlContent: `url: ${formattedUrl}\n---\n- navigate: /`,
          steps: [{ id: '1', command: 'navigate', value: '/', status: 'pending' }],
        },
      ];
    } else {
      // Standard template
      starterFlows = [
        {
          id: `flow-${timestamp}-0`,
          name: 'smoke-test.yaml',
          path: 'flows/smoke-test.yaml',
          category: 'Smoke',
          tags: ['smoke', 'e2e'],
          metadata: { url: formattedUrl, browser: 'chromium' },
          yamlContent: `url: ${formattedUrl}\n---\n- navigate: /\n- assertTitle: "Welcome"\n- assertVisible: "Header"`,
          steps: [
            { id: '1', command: 'navigate', value: '/', status: 'pending' },
            { id: '2', command: 'assertTitle', value: 'Welcome', status: 'pending' },
            { id: '3', command: 'assertVisible', value: 'Header', status: 'pending' },
          ],
        },
      ];
    }

    const newProject: Project = {
      id: `proj-${timestamp}`,
      name: formName.trim(),
      description: t('projects.defaultDescription'),
      targetUrl: formattedUrl,
      environment: formEnv,
      tags: [formEnv, formTemplate],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      lastRunStatus: 'NEVER_RUN',
      lastRunTime: 'Just created',
      passRate: 0,
      flows: starterFlows,
      config: {
        browser: 'chromium',
        headless: false,
        timeout: 10000,
        retries: 0,
      },
    };

    createProject(newProject);
    selectAgent(selectedAgentId);
    setCurrentView('studio');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-stone-950 font-sans text-stone-100 p-4 sm:p-6 h-full w-full overflow-y-auto">
      <div className="w-full max-w-3xl flex flex-col space-y-6 my-auto py-4">

        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center mb-1">
            <ProQALogo size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-amber-100 tracking-tight">
            {t('setup.welcomeTitle')}
          </h1>
          {isWeb ? (
            <div className="space-y-2">
              <p className="text-stone-400 text-xs max-w-lg mx-auto">
                {t('setup.browserNotice')}
              </p>
              <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-sky-950/50 border border-sky-800/40 rounded-md max-w-lg mx-auto text-[11px] text-sky-300">
                <Cloud className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{t('setup.browserCapabilities')}</span>
              </div>
              <a
                href="/proqa-setup.exe"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] transition-all shadow-md border border-amber-600 cursor-pointer"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('setup.downloadDesktop')}</span>
              </a>
            </div>
          ) : (
            <p className="text-stone-400 text-xs max-w-lg mx-auto">
              {step === 1 ? t('setup.step1Description') : t('setup.step2Description')}
            </p>
          )}
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center justify-center space-x-3 text-xs font-mono">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${
            step === 1
              ? 'bg-amber-950/80 border-amber-500 text-amber-300 ring-1 ring-amber-500/40 shadow-xs'
              : 'bg-stone-900 border-stone-800 text-stone-400'
          }`}>
            <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-bold">1</span>
            <span className="font-bold">{t('setup.step1Badge')}</span>
          </div>

          <div className="w-8 h-px bg-stone-800" />

          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${
            step === 2
              ? 'bg-amber-950/80 border-amber-500 text-amber-300 ring-1 ring-amber-500/40 shadow-xs'
              : 'bg-stone-900 border-stone-800 text-stone-500'
          }`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === 2 ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'
            }`}>2</span>
            <span className="font-bold">{t('setup.step2Badge')}</span>
          </div>
        </div>

        {/* Wizard Step Content Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl p-5 sm:p-7 space-y-5">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h2 className="font-bold text-amber-100 text-sm flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    <span>{t('setup.step1Heading')}</span>
                  </h2>
                  <p className="text-stone-400 text-xs mt-0.5">{t('setup.step1Description')}</p>
                </div>
                <span className="text-[11px] font-mono text-amber-400 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                  {t('setup.stepIndicator', { current: 1, total: 2 })}
                </span>
              </div>

              <AgentSelector detectedAgents={detectedAgents} size="md" />

              <div className="flex justify-end pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={handleNextToStep2}
                  disabled={!selectedAgentId}
                  className={`px-6 py-2.5 rounded-lg font-bold text-xs flex items-center space-x-2 transition-all shadow-lg ${
                    selectedAgentId
                      ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer shadow-amber-900/40'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span>{t('setup.nextToProject')}</span>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFinishSetup} className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h2 className="font-bold text-amber-100 text-sm flex items-center space-x-2">
                    <FolderPlus className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    <span>{t('setup.step2Heading')}</span>
                  </h2>
                  <p className="text-stone-400 text-xs mt-0.5">{t('setup.step2Description')}</p>
                </div>
                <span className="text-[11px] font-mono text-amber-400 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                  {t('setup.stepIndicator', { current: 2, total: 2 })}
                </span>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-[6px] text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              {/* Project Name */}
              <div className="space-y-1.5">
                <label htmlFor="wizard-project-name" className="block text-xs font-bold text-stone-300">
                  {t('setup.projectName')} <span className="text-rose-400">*</span>
                </label>
                <input
                  id="wizard-project-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormError('');
                  }}
                  placeholder={t('setup.projectNamePlaceholder')}
                  className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-stone-100 focus:outline-hidden focus:border-amber-600"
                />
              </div>

              {/* Target Web URL */}
              <div className="space-y-1.5">
                <label htmlFor="wizard-target-url" className="block text-xs font-bold text-stone-300">
                  {t('setup.targetUrl')} <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-stone-400 absolute left-3 top-3" aria-hidden="true" />
                  <input
                    id="wizard-target-url"
                    type="text"
                    required
                    value={formUrl}
                    onChange={(e) => {
                      setFormUrl(e.target.value);
                      setFormError('');
                    }}
                    placeholder={t('setup.targetUrlPlaceholder')}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-amber-300 font-mono focus:outline-hidden focus:border-amber-600"
                  />
                </div>
              </div>

              {/* Environment & Starter Template Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="wizard-env-select" className="block text-xs font-bold text-stone-300">
                    {t('setup.environment')}
                  </label>
                  <select
                    id="wizard-env-select"
                    value={formEnv}
                    onChange={(e) => setFormEnv(e.target.value as any)}
                    className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-stone-100 focus:outline-hidden cursor-pointer"
                  >
                    <option value="local">{t('projects.localDev')}</option>
                    <option value="staging">{t('projects.staging')}</option>
                    <option value="development">{t('projects.development')}</option>
                    <option value="production">{t('projects.production')}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="wizard-template-select" className="block text-xs font-bold text-stone-300">
                    {t('setup.starterTemplate')}
                  </label>
                  <select
                    id="wizard-template-select"
                    value={formTemplate}
                    onChange={(e) => setFormTemplate(e.target.value as any)}
                    className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-stone-100 focus:outline-hidden cursor-pointer"
                  >
                    <option value="standard">{t('setup.templateStandard')}</option>
                    <option value="ecommerce">{t('setup.templateEcommerce')}</option>
                    <option value="auth">{t('setup.templateAuth')}</option>
                    <option value="blank">{t('setup.templateBlank')}</option>
                  </select>
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('setup.backToStep1')}</span>
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded-lg font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-900/40 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>{t('setup.createAndLaunch')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
