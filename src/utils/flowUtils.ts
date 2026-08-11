import { FlowFile, FlowCategory } from '../types/autoflow';

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
    label: 'E2E User Journeys',
    badgeLabel: 'E2E',
    iconName: 'Globe',
    color: 'emerald',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-950/60',
    borderColor: 'border-emerald-800/60',
    activeBg: 'bg-emerald-900/40',
    description: 'Full browser UI flows (pages, checkout, forms, clicks)',
  },
  {
    id: 'API',
    label: 'API Request & Mocking',
    badgeLabel: 'API',
    iconName: 'Server',
    color: 'cyan',
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-950/60',
    borderColor: 'border-cyan-800/60',
    activeBg: 'bg-cyan-900/40',
    description: 'REST / GraphQL endpoints & network route interceptions',
  },
  {
    id: 'Smoke',
    label: 'Smoke Tests',
    badgeLabel: 'SMOKE',
    iconName: 'Flame',
    color: 'amber',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-950/60',
    borderColor: 'border-amber-800/60',
    activeBg: 'bg-amber-900/40',
    description: 'High-priority build verification & health check flows',
  },
  {
    id: 'Visual',
    label: 'Visual & Responsive',
    badgeLabel: 'VISUAL',
    iconName: 'Eye',
    color: 'purple',
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-950/60',
    borderColor: 'border-purple-800/60',
    activeBg: 'bg-purple-900/40',
    description: 'Visual screenshot regression & viewport responsiveness',
  },
  {
    id: 'Component',
    label: 'Component Specs',
    badgeLabel: 'COMPONENT',
    iconName: 'Box',
    color: 'blue',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-950/60',
    borderColor: 'border-blue-800/60',
    activeBg: 'bg-blue-900/40',
    description: 'Isolated component states & widget interactions',
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
