import React from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { useUiStore } from '@/src/stores/uiStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Keyboard, Play, Layout, Command, Code2 } from 'lucide-react';

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  icon: React.ReactNode;
  shortcuts: ShortcutEntry[];
}

export const ShortcutsModal: React.FC = () => {
  const isShortcutsModalOpen = useUiStore((s) => s.isShortcutsModalOpen);
  const setShortcutsModalOpen = useUiStore((s) => s.setShortcutsModalOpen);
  const { t } = useTranslation();

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const categories: ShortcutCategory[] = [
    {
      title: t('shortcuts.categories.execution'),
      icon: <Play className="w-4 h-4 text-emerald-400" />,
      shortcuts: [
        {
          keys: [modKey, 'Enter'],
          description: t('shortcuts.items.runFlow'),
        },
        {
          keys: [modKey, 'Shift', 'P'],
          description: t('shortcuts.items.pauseResume'),
        },
      ],
    },
    {
      title: t('shortcuts.categories.navigation'),
      icon: <Layout className="w-4 h-4 text-sky-400" />,
      shortcuts: [
        {
          keys: [modKey, '1-9'],
          description: t('shortcuts.items.switchProject', { num: '1-9' }),
        },
        {
          keys: [modKey, 'Tab'],
          description: t('shortcuts.items.cycleFlowForward'),
        },
        {
          keys: [modKey, 'Shift', 'Tab'],
          description: t('shortcuts.items.cycleFlowBackward'),
        },
      ],
    },
    {
      title: t('shortcuts.categories.studio'),
      icon: <Code2 className="w-4 h-4 text-amber-400" />,
      shortcuts: [
        {
          keys: [modKey, 'S'],
          description: t('shortcuts.items.saveFlow'),
        },
      ],
    },
    {
      title: t('shortcuts.categories.palette'),
      icon: <Command className="w-4 h-4 text-purple-400" />,
      shortcuts: [
        {
          keys: [modKey, 'K'],
          description: t('shortcuts.items.openPalette'),
        },
        {
          keys: ['?'],
          description: t('shortcuts.items.openShortcuts'),
        },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isShortcutsModalOpen}
      onClose={() => setShortcutsModalOpen(false)}
      title={
        <div className="flex items-center space-x-2">
          <Keyboard className="w-4 h-4 text-amber-400" />
          <span>{t('shortcuts.title')}</span>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 text-stone-200">
        <p className="text-xs text-stone-400">{t('shortcuts.subtitle')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.title}
              className="bg-stone-950/60 border border-stone-800 rounded-lg p-3 space-y-2.5"
            >
              <div className="flex items-center space-x-2 border-b border-stone-800/80 pb-2">
                {cat.icon}
                <span className="font-semibold text-xs text-stone-200">{cat.title}</span>
              </div>

              <div className="space-y-2">
                {cat.shortcuts.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-stone-300 pr-2">{item.description}</span>
                    <div className="flex items-center space-x-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-stone-200 bg-stone-800 border border-stone-700 rounded shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
