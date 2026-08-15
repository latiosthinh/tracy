import enTranslations from '@/src/a11y/en.json';

export type Translations = typeof enTranslations;

export function useTranslation() {
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let current: any = enTranslations;
    
    for (const k of keys) {
      if (current === undefined || current === null || current[k] === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
      current = current[k];
    }

    if (typeof current !== 'string') {
      return key;
    }

    if (params) {
      return current.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : match;
      });
    }
    
    return current;
  };

  return { t };
}

