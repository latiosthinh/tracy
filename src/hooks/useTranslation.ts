import enTranslations from '@/src/a11y/en.json';

export type Translations = typeof enTranslations;

type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`;

export type DotNestedKeys<T> = (
  T extends object
    ? {
        [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DotNestedKeys<T[K]>>}`;
      }[Exclude<keyof T, symbol>]
    : ''
) extends infer D
  ? Extract<D, string>
  : never;

export type TranslationKey = DotNestedKeys<Translations>;

export function useTranslation() {
  const t = (key: TranslationKey | (string & {}), params?: Record<string, string | number>): string => {
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


