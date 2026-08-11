import React, { useState, useRef } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  PanelLeft,
  PanelRight,
  Palette,
  Upload,
  Download,
  Check,
  AlertCircle,
  Globe,
  Eye,
  SlidersHorizontal,
  Type,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import {
  UiSettings,
  ColorScheme,
  PRESET_COLOR_SCHEMES,
  DEFAULT_UI_SETTINGS,
  AppLanguage,
  ThemeMode,
  YamlPosition,
  UiScale
} from '../../types/uiSettings';

interface UiSettingsPanelProps {
  settings: UiSettings;
  onChange: (updated: UiSettings) => void;
}

export const UiSettingsPanel: React.FC<UiSettingsPanelProps> = ({
  settings,
  onChange,
}) => {
  const [jsonText, setJsonText] = useState(
    settings.colorSchemeJson || JSON.stringify(settings.colorScheme, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonSuccess, setJsonSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Theme Change
  const handleThemeChange = (mode: ThemeMode) => {
    let targetScheme = settings.colorScheme;
    if (mode === 'light' && (settings.colorScheme.id === 'tracy-amber' || settings.colorScheme.id === 'midnight-cyan' || settings.colorScheme.id === 'nordic-frost')) {
      targetScheme = PRESET_COLOR_SCHEMES.find(s => s.id === 'clean-paper-light') || PRESET_COLOR_SCHEMES[3];
    } else if (mode === 'dark' && (settings.colorScheme.id === 'clean-paper-light' || settings.colorScheme.id === 'solarized-light')) {
      targetScheme = PRESET_COLOR_SCHEMES.find(s => s.id === 'tracy-amber') || PRESET_COLOR_SCHEMES[0];
    }

    const formatted = JSON.stringify(targetScheme, null, 2);
    setJsonText(formatted);

    onChange({
      ...settings,
      theme: mode,
      colorScheme: targetScheme,
      colorSchemeJson: formatted,
    });
  };

  // Handle YAML Position Change
  const handlePositionChange = (pos: YamlPosition) => {
    onChange({
      ...settings,
      yamlPosition: pos,
    });
  };

  // Handle Preset Scheme Click
  const handleSelectPreset = (scheme: ColorScheme) => {
    const formatted = JSON.stringify(scheme, null, 2);
    setJsonText(formatted);
    setJsonError(null);
    setJsonSuccess(`Applied "${scheme.name}" color scheme`);
    setTimeout(() => setJsonSuccess(null), 3000);

    const isLightScheme = scheme.id === 'clean-paper-light' || scheme.id === 'solarized-light' || scheme.bgPrimary.toLowerCase() > '#888888';

    onChange({
      ...settings,
      theme: isLightScheme ? 'light' : 'dark',
      colorScheme: scheme,
      colorSchemeJson: formatted,
    });
  };

  // Handle JSON Text Editing
  const handleJsonTextChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text) as ColorScheme;
      if (!parsed.bgPrimary || !parsed.accent || !parsed.textPrimary) {
        setJsonError('JSON must contain "bgPrimary", "accent", and "textPrimary" color hex codes.');
        return;
      }
      setJsonError(null);
      setJsonSuccess('Valid Custom Color Scheme JSON');
      setTimeout(() => setJsonSuccess(null), 2500);

      onChange({
        ...settings,
        colorScheme: {
          ...parsed,
          id: parsed.id || 'custom-uploaded',
          name: parsed.name || 'Custom Scheme',
        },
        colorSchemeJson: text,
      });
    } catch (err) {
      setJsonError((err as Error).message);
    }
  };

  // Upload Custom Scheme JSON File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonText(content);
        handleJsonTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  // Download Scheme JSON File
  const handleDownloadScheme = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${settings.colorScheme.id || 'custom'}-scheme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    const def = DEFAULT_UI_SETTINGS;
    setJsonText(def.colorSchemeJson);
    setJsonError(null);
    setJsonSuccess('Reset to default UI preferences');
    setTimeout(() => setJsonSuccess(null), 2500);
    onChange(def);
  };

  const languageNames: Record<AppLanguage, { name: string; native: string }> = {
    en: { name: 'English', native: 'English' },
    es: { name: 'Spanish', native: 'Español' },
    fr: { name: 'French', native: 'Français' },
    de: { name: 'German', native: 'Deutsch' },
    vi: { name: 'Vietnamese', native: 'Tiếng Việt' },
    ja: { name: 'Japanese', native: '日本語' },
    zh: { name: 'Chinese', native: '中文' },
  };

  return (
    <div className="space-y-6 text-stone-100 font-sans text-xs pb-4">
      {/* SECTION 1: Theme & Visual Appearance */}
      <div className="bg-stone-950 p-4 rounded-[8px] border border-stone-800 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm">
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Theme & Workspace Appearance</span>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] font-mono text-stone-400 hover:text-stone-200 flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset UI Defaults</span>
          </button>
        </div>

        {/* Dark vs Light vs System */}
        <div>
          <label className="block text-stone-300 font-bold mb-2">Dark / Light Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'High-contrast dark canvas' },
              { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean bright layout' },
              { id: 'system', label: 'System Default', icon: Laptop, desc: 'Follow OS preferences' },
            ].map((item) => {
              const Icon = item.icon;
              const active = settings.theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleThemeChange(item.id as ThemeMode)}
                  className={`p-3 rounded-[6px] border text-left flex flex-col justify-between transition-all ${
                    active
                      ? 'bg-amber-950/70 border-amber-500 text-amber-100 ring-1 ring-amber-500/50'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold text-amber-300 mb-1">
                    <Icon className="w-4 h-4 text-amber-400" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">{item.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side YAML Editor Position: Left vs Right */}
        <div className="pt-2">
          <label className="block text-stone-300 font-bold mb-2">Side YAML Editor & IDE Panel Position</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handlePositionChange('left')}
              className={`p-3 rounded-[6px] border text-left flex items-center space-x-3 transition-all ${
                settings.yamlPosition === 'left'
                  ? 'bg-amber-950/70 border-amber-500 text-amber-100 ring-1 ring-amber-500/50'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
              }`}
            >
              <PanelLeft className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold block text-stone-100">Left Side Editor</span>
                <span className="text-[10px] text-stone-400 font-mono">YAML Editor on Left, Browser Sandbox on Right</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handlePositionChange('right')}
              className={`p-3 rounded-[6px] border text-left flex items-center space-x-3 transition-all ${
                settings.yamlPosition === 'right'
                  ? 'bg-amber-950/70 border-amber-500 text-amber-100 ring-1 ring-amber-500/50'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
              }`}
            >
              <PanelRight className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold block text-stone-100">Right Side Editor (Default)</span>
                <span className="text-[10px] text-stone-400 font-mono">Browser Sandbox on Left, YAML Editor on Right</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Custom Color Scheme & JSON Editor */}
      <div className="bg-stone-950 p-4 rounded-[8px] border border-stone-800 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm">
            <Palette className="w-4 h-4 text-amber-400" />
            <span>Custom Color Scheme & JSON Configuration</span>
          </div>
          <span className="text-[10px] font-mono text-stone-400">Stored & editable as JSON</span>
        </div>

        {/* Preset Palettes */}
        <div>
          <label className="block text-stone-300 font-bold mb-2">Select Color Scheme Preset</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESET_COLOR_SCHEMES.map((scheme) => {
              const active = settings.colorScheme.id === scheme.id;
              return (
                <button
                  key={scheme.id}
                  type="button"
                  onClick={() => handleSelectPreset(scheme)}
                  className={`p-2.5 rounded-[6px] border text-left flex flex-col justify-between transition-all ${
                    active
                      ? 'bg-amber-950/70 border-amber-500 text-amber-100 ring-1 ring-amber-500/50'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                  }`}
                >
                  <span className="font-bold text-xs truncate mb-2">{scheme.name}</span>
                  {/* Swatch dots */}
                  <div className="flex items-center space-x-1">
                    <span className="w-3 h-3 rounded-full border border-stone-700" style={{ backgroundColor: scheme.bgPrimary }} title="Primary BG" />
                    <span className="w-3 h-3 rounded-full border border-stone-700" style={{ backgroundColor: scheme.bgSecondary }} title="Secondary BG" />
                    <span className="w-3 h-3 rounded-full border border-stone-700" style={{ backgroundColor: scheme.accent }} title="Accent Color" />
                    <span className="w-3 h-3 rounded-full border border-stone-700" style={{ backgroundColor: scheme.textPrimary }} title="Text Primary" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Swatch Preview Bar */}
        <div className="p-3 bg-stone-900 rounded-[6px] border border-stone-800 space-y-2">
          <span className="font-bold text-[11px] text-stone-300 block">Current Active Swatches</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
            <div className="flex items-center space-x-2 p-1.5 bg-stone-950 rounded border border-stone-800">
              <span className="w-4 h-4 rounded border border-stone-700 shrink-0" style={{ backgroundColor: settings.colorScheme.bgPrimary }} />
              <div className="truncate">
                <span className="text-stone-400 block">Primary BG</span>
                <span className="text-stone-200 font-bold">{settings.colorScheme.bgPrimary}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-1.5 bg-stone-950 rounded border border-stone-800">
              <span className="w-4 h-4 rounded border border-stone-700 shrink-0" style={{ backgroundColor: settings.colorScheme.bgSecondary }} />
              <div className="truncate">
                <span className="text-stone-400 block">Secondary BG</span>
                <span className="text-stone-200 font-bold">{settings.colorScheme.bgSecondary}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-1.5 bg-stone-950 rounded border border-stone-800">
              <span className="w-4 h-4 rounded border border-stone-700 shrink-0" style={{ backgroundColor: settings.colorScheme.accent }} />
              <div className="truncate">
                <span className="text-stone-400 block">Accent</span>
                <span className="text-amber-300 font-bold">{settings.colorScheme.accent}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-1.5 bg-stone-950 rounded border border-stone-800">
              <span className="w-4 h-4 rounded border border-stone-700 shrink-0" style={{ backgroundColor: settings.colorScheme.textPrimary }} />
              <div className="truncate">
                <span className="text-stone-400 block">Text</span>
                <span className="text-stone-200 font-bold">{settings.colorScheme.textPrimary}</span>
              </div>
            </div>
          </div>
        </div>

        {/* JSON Editor & File Upload */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-stone-300 font-bold">Edit Color Scheme JSON</label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold rounded-[4px] border border-stone-800 flex items-center space-x-1"
                title="Upload custom .json color scheme"
              >
                <Upload className="w-3 h-3 text-amber-400" />
                <span>Upload JSON</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadScheme}
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold rounded-[4px] border border-stone-800 flex items-center space-x-1"
                title="Export color scheme to JSON file"
              >
                <Download className="w-3 h-3 text-stone-400" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          <textarea
            rows={8}
            value={jsonText}
            onChange={(e) => handleJsonTextChange(e.target.value)}
            className="w-full p-3 bg-stone-900 border border-stone-800 rounded-[6px] font-mono text-xs text-amber-200 focus:outline-hidden focus:border-amber-600 leading-relaxed"
          />

          {jsonError && (
            <div className="mt-1.5 p-2 bg-rose-950/80 border border-rose-800 rounded text-rose-200 text-[11px] font-mono flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}

          {jsonSuccess && (
            <div className="mt-1.5 p-2 bg-emerald-950/80 border border-emerald-800 rounded text-emerald-200 text-[11px] font-mono flex items-center space-x-1.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{jsonSuccess}</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Language & Accessibility (a11y) */}
      <div className="bg-stone-950 p-4 rounded-[8px] border border-stone-800 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm">
            <Globe className="w-4 h-4 text-amber-400" />
            <span>Language & Accessibility (a11y) Settings</span>
          </div>
        </div>

        {/* Language Selection */}
        <div>
          <label className="block text-stone-300 font-bold mb-1.5">Interface Language</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(languageNames) as AppLanguage[]).map((langKey) => {
              const lang = languageNames[langKey];
              const active = settings.language === langKey;
              return (
                <button
                  key={langKey}
                  type="button"
                  onClick={() => onChange({ ...settings, language: langKey })}
                  className={`p-2.5 rounded-[6px] border text-left flex flex-col justify-between transition-all ${
                    active
                      ? 'bg-amber-950/70 border-amber-500 text-amber-100 ring-1 ring-amber-500/50'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                  }`}
                >
                  <span className="font-bold text-xs text-stone-100">{lang.native}</span>
                  <span className="text-[10px] text-stone-400 font-mono uppercase">{lang.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accessibility Toggles */}
        <div className="space-y-3 pt-2 border-t border-stone-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-stone-200 block">High Contrast Mode</span>
              <span className="text-[10px] text-stone-400 font-mono">Enhances border definitions and text legibility</span>
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...settings,
                  a11y: { ...settings.a11y, highContrast: !settings.a11y.highContrast },
                })
              }
              className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                settings.a11y.highContrast ? 'bg-amber-600' : 'bg-stone-800'
              }`}
            >
              <span
                className={`w-4 h-4 bg-white rounded-full block transition-transform ${
                  settings.a11y.highContrast ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-stone-200 block">UI Font & Text Scaling</span>
              <span className="text-[10px] text-stone-400 font-mono">Adjust interface text size for visual comfort</span>
            </div>
            <div className="flex items-center space-x-1 bg-stone-900 p-1 rounded border border-stone-800">
              {[
                { id: 'normal', label: '100%' },
                { id: 'large', label: '110%' },
                { id: 'xlarge', label: '120%' },
              ].map((scale) => (
                <button
                  key={scale.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...settings,
                      a11y: { ...settings.a11y, fontSize: scale.id as UiScale },
                    })
                  }
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                    settings.a11y.fontSize === scale.id
                      ? 'bg-amber-800 text-amber-100'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {scale.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-stone-200 block">Reduce Motion & Animations</span>
              <span className="text-[10px] text-stone-400 font-mono">Disables non-essential UI transitions</span>
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...settings,
                  a11y: { ...settings.a11y, reducedMotion: !settings.a11y.reducedMotion },
                })
              }
              className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                settings.a11y.reducedMotion ? 'bg-amber-600' : 'bg-stone-800'
              }`}
            >
              <span
                className={`w-4 h-4 bg-white rounded-full block transition-transform ${
                  settings.a11y.reducedMotion ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
