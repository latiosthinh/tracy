import { FlowFile, FlowCategory } from '@/src/types/autoflow';
import enTranslations from '@/src/a11y/en.json';

export interface CategoryInfo {
  id: FlowCategory;
  label: string;
  badgeLabel: string;
  iconName: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  activeBg: string;
  description: string;
}

export const PLAYWRIGHT_CATEGORIES: CategoryInfo[] = [
  {
    id: 'E2E',
    label: enTranslations.common.flowCategories.e2e.label,
    badgeLabel: enTranslations.common.flowCategories.e2e.badge,
    iconName: 'Globe',
    color: 'emerald',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-950/60',
    borderColor: 'border-emerald-800/60',
    activeBg: 'bg-emerald-900/40',
    description: enTranslations.common.flowCategories.e2e.description,
  },
  {
    id: 'API',
    label: enTranslations.common.flowCategories.api.label,
    badgeLabel: enTranslations.common.flowCategories.api.badge,
    iconName: 'Server',
    color: 'cyan',
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-950/60',
    borderColor: 'border-cyan-800/60',
    activeBg: 'bg-cyan-900/40',
    description: enTranslations.common.flowCategories.api.description,
  },
  {
    id: 'Smoke',
    label: enTranslations.common.flowCategories.smoke.label,
    badgeLabel: enTranslations.common.flowCategories.smoke.badge,
    iconName: 'Flame',
    color: 'amber',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-950/60',
    borderColor: 'border-amber-800/60',
    activeBg: 'bg-amber-900/40',
    description: enTranslations.common.flowCategories.smoke.description,
  },
  {
    id: 'Visual',
    label: enTranslations.common.flowCategories.visual.label,
    badgeLabel: enTranslations.common.flowCategories.visual.badge,
    iconName: 'Eye',
    color: 'purple',
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-950/60',
    borderColor: 'border-purple-800/60',
    activeBg: 'bg-purple-900/40',
    description: enTranslations.common.flowCategories.visual.description,
  },
  {
    id: 'Component',
    label: enTranslations.common.flowCategories.component.label,
    badgeLabel: enTranslations.common.flowCategories.component.badge,
    iconName: 'Box',
    color: 'blue',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-950/60',
    borderColor: 'border-blue-800/60',
    activeBg: 'bg-blue-900/40',
    description: enTranslations.common.flowCategories.component.description,
  },
];


export function getFlowCategory(flow: FlowFile): FlowCategory {
  if (flow.category) return flow.category;

  const lowerYaml = flow.yamlContent?.toLowerCase() || '';
  const tags = (flow.tags || []).map(t => t.toLowerCase());

  if (tags.includes('api') || tags.includes('network') || tags.includes('mocking') || lowerYaml.includes('interceptnetwork')) {
    return 'API';
  }
  if (tags.includes('smoke') || tags.includes('critical')) {
    return 'Smoke';
  }
  if (tags.includes('visual') || tags.includes('responsive') || tags.includes('mobile') || lowerYaml.includes('setviewport') || lowerYaml.includes('takescreenshot')) {
    return 'Visual';
  }
  if (tags.includes('component') || tags.includes('unit')) {
    return 'Component';
  }
  return 'E2E';
}

export function groupFlowsByCategory(flows: FlowFile[]): { category: CategoryInfo; flows: FlowFile[] }[] {
  const map = new Map<FlowCategory, FlowFile[]>();

  PLAYWRIGHT_CATEGORIES.forEach(cat => {
    map.set(cat.id, []);
  });

  flows.forEach(flow => {
    const cat = getFlowCategory(flow);
    const existing = map.get(cat) || [];
    existing.push(flow);
    map.set(cat, existing);
  });

  return PLAYWRIGHT_CATEGORIES.map(cat => ({
    category: cat,
    flows: map.get(cat.id) || [],
  })).filter(group => group.flows.length > 0);
}
