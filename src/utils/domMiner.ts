import { InspectedElement } from '@/src/types';

export interface MinedNode {
  id: number;
  tag: string;
  role?: string;
  text?: string;
  type?: string;
  name?: string;
  placeholder?: string;
  testId?: string;
  href?: string;
  isInteractive: boolean;
  isVisible: boolean;
  children: MinedNode[];
  locator: string;
}

export interface MinedPage {
  url: string;
  title: string;
  timestamp: string;
  nodes: MinedNode[];
  tree: string;
  stats: {
    totalNodes: number;
    interactiveNodes: number;
    textHolders: number;
    visibleNodes: number;
  };
}

const INTERACTIVE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea']);
const INTERACTIVE_ROLES = new Set(['button', 'link', 'textbox', 'combobox', 'listbox', 'menuitem', 'checkbox', 'radio', 'tab', 'switch']);
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'link', 'meta', 'head']);
const TEXT_CONTAINER_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'li', 'td', 'th', 'label', 'figcaption', 'summary', 'dt', 'dd']);

function getRole(el: HTMLElement): string | undefined {
  const role = el.getAttribute('role');
  if (role) return role;

  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case 'a': return el.getAttribute('href') ? 'link' : undefined;
    case 'button': return 'button';
    case 'input': {
      const type = (el as HTMLInputElement).type;
      if (type === 'text' || type === 'email' || type === 'password' || type === 'search' || type === 'tel' || type === 'url' || type === 'number') return 'textbox';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'submit' || type === 'reset') return 'button';
      return 'textbox';
    }
    case 'select': return 'combobox';
    case 'textarea': return 'textbox';
    case 'img': return 'img';
    case 'nav': return 'navigation';
    case 'main': return 'main';
    case 'header': return 'banner';
    case 'footer': return 'contentinfo';
    case 'aside': return 'complementary';
    case 'form': return 'form';
    case 'section': return 'region';
    case 'article': return 'article';
    default: return undefined;
  }
}

function isElementVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function getPlaywrightLocator(el: HTMLElement, index: number): string {
  const testId = el.getAttribute('data-testid');
  if (testId) return `getByTestId('${testId}')`;

  const role = getRole(el);
  const name = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 50);
  if (role && name) return `getByRole('${role}', { name: '${name.replace(/'/g, "\\'")}' })`;

  const placeholder = (el as HTMLInputElement).placeholder;
  if (placeholder) return `getByPlaceholder('${placeholder.replace(/'/g, "\\'")}')`;

  const href = el.getAttribute('href');
  if (el.tagName.toLowerCase() === 'a' && href) return `getByRole('link', { name: '${(el.textContent?.trim() || href).replace(/'/g, "\\'")}' })`;

  if (el.id) return `locator('#${el.id}')`;

  const classes = el.className ? `.${el.className.split(' ').filter(Boolean).slice(0, 2).join('.')}` : '';
  return `locator('${el.tagName.toLowerCase()}${classes}').nth(${index})`;
}

function extractTextContent(el: HTMLElement): string | undefined {
  const directText = Array.from(el.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent?.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 100);

  if (directText && TEXT_CONTAINER_TAGS.has(el.tagName.toLowerCase())) {
    return directText;
  }

  if (el.tagName.toLowerCase() === 'img') {
    return el.getAttribute('alt') || undefined;
  }

  return undefined;
}

function mineElement(el: HTMLElement, counter: { id: number }, depth: number, maxDepth: number): MinedNode | null {
  if (depth > maxDepth) return null;

  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return null;

  const role = getRole(el);
  const isInteractive = INTERACTIVE_TAGS.has(tag) || (role ? INTERACTIVE_ROLES.has(role) : false);
  const isVisible = isElementVisible(el);

  const text = extractTextContent(el);
  const testId = el.getAttribute('data-testid') || undefined;
  const href = el.getAttribute('href') || undefined;
  const placeholder = (el as HTMLInputElement).placeholder || undefined;
  const name = el.getAttribute('aria-label') || undefined;
  const type = (el as HTMLInputElement).type || undefined;

  counter.id++;
  const id = counter.id;
  const locator = getPlaywrightLocator(el, id);

  const children: MinedNode[] = [];
  for (const child of Array.from(el.children)) {
    if (child instanceof HTMLElement) {
      const mined = mineElement(child, counter, depth + 1, maxDepth);
      if (mined) children.push(mined);
    }
  }

  return {
    id,
    tag,
    role,
    text: text || undefined,
    type: type !== tag ? type : undefined,
    name,
    placeholder,
    testId,
    href,
    isInteractive,
    isVisible,
    children,
    locator,
  };
}

function nodeToTreeString(node: MinedNode, indent: number = 0): string {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  let desc = '';
  if (node.isInteractive) {
    desc = `[${node.id}] `;
    if (node.role) desc += `${node.role} `;
    if (node.text) desc += `"${node.text}"`;
    else if (node.name) desc += `"${node.name}"`;
    else if (node.placeholder) desc += `"${node.placeholder}"`;
    else if (node.href) desc += `"${node.href}"`;
    else desc += node.tag;
  } else if (node.text) {
    desc = `text:${node.tag} "${node.text}"`;
  } else if (node.tag === 'img' && node.text) {
    desc = `img "${node.text}"`;
  }

  if (desc) {
    lines.push(`${prefix}${desc}`);
  }

  for (const child of node.children) {
    lines.push(nodeToTreeString(child, child.isInteractive || child.text ? indent + (desc ? 1 : 0) : indent));
  }

  return lines.join('\n');
}

export function mineDOM(rootElement: HTMLElement, maxDepth: number = 6): MinedPage {
  const counter = { id: 0 };
  const rootNode = mineElement(rootElement, counter, 0, maxDepth);

  if (!rootNode) {
    return {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      nodes: [],
      tree: '',
      stats: { totalNodes: 0, interactiveNodes: 0, textHolders: 0, visibleNodes: 0 },
    };
  }

  const allNodes: MinedNode[] = [];
  const flatten = (node: MinedNode) => {
    allNodes.push(node);
    node.children.forEach(flatten);
  };
  flatten(rootNode);

  const interactiveNodes = allNodes.filter(n => n.isInteractive && n.isVisible).length;
  const textHolders = allNodes.filter(n => n.text && !n.isInteractive).length;
  const visibleNodes = allNodes.filter(n => n.isVisible).length;

  const tree = nodeToTreeString(rootNode);

  return {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    nodes: allNodes,
    tree,
    stats: {
      totalNodes: allNodes.length,
      interactiveNodes,
      textHolders,
      visibleNodes,
    },
  };
}

function getPlaywrightJsonLocator(node: any, index: number): string {
  if (node.testId) return `getByTestId('${node.testId}')`;
  if (node.role && node.name) return `getByRole('${node.role}', { name: '${node.name.replace(/'/g, "\\'")}' })`;
  if (node.placeholder) return `getByPlaceholder('${node.placeholder.replace(/'/g, "\\'")}')`;
  if (node.tag === 'a' && node.href) return `getByRole('link', { name: '${(node.text || node.href).replace(/'/g, "\\'")}' })`;
  if (node.id) return `locator('#${node.id}')`;
  const classes = node.classes && node.classes.length > 0 ? `.${node.classes.slice(0, 2).join('.')}` : '';
  return `locator('${node.tag}${classes}').nth(${index})`;
}

export function minePlaywrightDom(playwrightTree: any, url: string, title: string): MinedPage {
  const counter = { id: 0 };
  
  function processNode(pwNode: any): MinedNode {
    counter.id++;
    const id = counter.id;
    const locator = getPlaywrightJsonLocator(pwNode, id);
    
    const children = [];
    if (pwNode.children && Array.isArray(pwNode.children)) {
      for (const child of pwNode.children) {
        children.push(processNode(child));
      }
    }
    
    return {
      id,
      tag: pwNode.tag,
      role: pwNode.role,
      text: pwNode.text,
      type: pwNode.type,
      name: pwNode.name,
      placeholder: pwNode.placeholder,
      testId: pwNode.testId,
      href: pwNode.href,
      isInteractive: !!pwNode.isInteractive,
      isVisible: !!pwNode.isVisible,
      locator,
      children,
    };
  }
  
  if (!playwrightTree) {
    return {
      url,
      title,
      timestamp: new Date().toISOString(),
      nodes: [],
      tree: '',
      stats: { totalNodes: 0, interactiveNodes: 0, textHolders: 0, visibleNodes: 0 },
    };
  }

  const rootNode = processNode(playwrightTree);
  
  const allNodes: MinedNode[] = [];
  const flatten = (node: MinedNode) => {
    allNodes.push(node);
    node.children.forEach(flatten);
  };
  flatten(rootNode);

  const interactiveNodes = allNodes.filter(n => n.isInteractive && n.isVisible).length;
  const textHolders = allNodes.filter(n => n.text && !n.isInteractive).length;
  const visibleNodes = allNodes.filter(n => n.isVisible).length;

  const tree = nodeToTreeString(rootNode);

  return {
    url,
    title,
    timestamp: new Date().toISOString(),
    nodes: allNodes,
    tree,
    stats: {
      totalNodes: allNodes.length,
      interactiveNodes,
      textHolders,
      visibleNodes,
    },
  };
}

export function formatMinedForPrompt(mined: MinedPage, maxNodes: number = 100): string {
  const interactiveNodes = mined.nodes
    .filter(n => n.isInteractive && n.isVisible)
    .slice(0, maxNodes);

  let output = `## Page DOM Map: ${mined.title}\n`;
  output += `URL: ${mined.url}\n`;
  output += `Nodes: text-holders ${mined.stats.textHolders}, interactive ${mined.stats.interactiveNodes} (visible ${mined.stats.visibleNodes})\n`;
  output += `${'─'.repeat(60)}\n\n`;

  output += mined.tree + '\n\n';

  output += `## Interactive Elements (Playwright Locators)\n`;
  output += `${'─'.repeat(60)}\n`;
  for (const node of interactiveNodes) {
    const desc = node.text || node.name || node.placeholder || node.tag;
    output += `[${node.id}] ${node.role || node.tag} "${desc}" → page.${node.locator}\n`;
  }

  return output;
}

export function generateSuggestedSelectors(elemData: any): InspectedElement['suggestedSelectors'] {
  const suggestedSelectors: InspectedElement['suggestedSelectors'] = [];

  if (elemData.testId) {
    suggestedSelectors.push({
      type: 'testId',
      value: elemData.testId,
      description: 'Target by explicit data-testid attribute',
      rating: 'best',
      yamlSnippet: `- click:\n    testId: "${elemData.testId}"`,
    });
  }

  if (elemData.role && elemData.text) {
    suggestedSelectors.push({
      type: 'role',
      value: elemData.role,
      description: `Target by ARIA role (${elemData.role}) and accessible text`,
      rating: 'recommended',
      yamlSnippet: `- click:\n    role: "${elemData.role}"\n    name: "${elemData.text.trim()}"`,
    });
  }

  if (elemData.label) {
    suggestedSelectors.push({
      type: 'label',
      value: elemData.label,
      description: 'Target input by associated form label',
      rating: 'recommended',
      yamlSnippet: `- inputText:\n    selector:\n      label: "${elemData.label}"\n    text: "..."`,
    });
  }

  if (elemData.placeholder) {
    suggestedSelectors.push({
      type: 'placeholder',
      value: elemData.placeholder,
      description: 'Target input by placeholder string',
      rating: 'recommended',
      yamlSnippet: `- inputText:\n    selector:\n      placeholder: "${elemData.placeholder}"\n    text: "..."`,
    });
  }

  if (elemData.text && elemData.text.trim().length > 0 && elemData.text.trim().length < 40) {
    suggestedSelectors.push({
      type: 'text',
      value: elemData.text.trim(),
      description: 'Target by visible screen text',
      rating: 'recommended',
      yamlSnippet: `- click: "${elemData.text.trim()}"`,
    });
  }

  if (elemData.id) {
    suggestedSelectors.push({
      type: 'id',
      value: elemData.id,
      description: 'Target by HTML element ID',
      rating: 'fallback',
      yamlSnippet: `- click:\n    id: "${elemData.id}"`,
    });
  }

  if (elemData.className) {
    const firstClass = elemData.className.split(' ')[0];
    suggestedSelectors.push({
      type: 'css',
      value: `.${firstClass}`,
      description: 'Target by CSS selector',
      rating: 'fragile',
      yamlSnippet: `- click:\n    css: ".${firstClass}"`,
    });
  }

  return suggestedSelectors;
}
