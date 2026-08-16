import React from 'react';
import {
  CheckSquare,
  Smartphone,
  Eye,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  LucideIcon,
} from 'lucide-react';
import { QA_RECIPES, QaRecipe } from '@/src/data/qaRecipes';
import { useTranslation } from '@/src/hooks/useTranslation';

const ICON_MAP: Record<string, LucideIcon> = {
  CheckSquare,
  Smartphone,
  Eye,
  ShieldCheck,
  ShoppingCart,
};

interface QaRecipeSelectorProps {
  onSelectRecipe: (recipe: QaRecipe) => void;
  disabled?: boolean;
}

export const QaRecipeSelector: React.FC<QaRecipeSelectorProps> = ({
  onSelectRecipe,
  disabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-stone-400 flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>{t('copilot.recipes.title')}</span>
        </span>
      </div>

      <div
        className="flex items-center space-x-1.5 overflow-x-auto pb-1.5 custom-scrollbar"
        role="toolbar"
        aria-label={t('copilot.recipes.title')}
      >
        {QA_RECIPES.map((recipe) => {
          const Icon = ICON_MAP[recipe.icon] || Sparkles;
          const label = t(recipe.labelKey);
          const description = t(recipe.descriptionKey);

          return (
            <button
              key={recipe.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectRecipe(recipe)}
              title={description}
              aria-label={`${label} — ${description}`}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-stone-900 hover:bg-stone-800 active:bg-amber-950/40 text-stone-300 hover:text-amber-300 border border-stone-800 hover:border-amber-700/60 rounded-[6px] text-[11px] font-medium transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group shadow-xs"
            >
              <Icon className="w-3 h-3 text-amber-400/80 group-hover:text-amber-300 shrink-0 transition-colors" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
