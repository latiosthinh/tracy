import enTranslations from '@/src/a11y/en.json';

export type Translations = typeof enTranslations;

export function useTranslation() {
  const t = (key: string): string => {
    const keys = key.split('.');
    let current: any = enTranslations;
    
    for (const k of keys) {
      if (current[k] === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
      current = current[k];
    }
    
    return current;
  };

  return { t };
}
