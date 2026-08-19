import crypto from 'crypto';

/**
 * Strips dynamic text nodes, volatile attributes (id matching UUID/counters, random tokens, inline styles),
 * preserving tags, structure, and semantic roles.
 */
export function extractStructuralSkeleton(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // 1. Remove comments, scripts, styles, svg content
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '<svg></svg>');

  // 2. Extract tags and only keep semantic/structural attributes: role, type, aria-modal, aria-expanded
  // We drop volatile ids, style, volatile classes, onclicks, text values
  cleaned = cleaned.replace(/<([a-z0-9-]+)([^>]*)>/gi, (_match, tagName, rawAttrs) => {
    const tag = tagName.toLowerCase();
    const allowedAttrs: string[] = [];

    // Extract role
    const roleMatch = rawAttrs.match(/\brole=["']([^"']+)["']/i);
    if (roleMatch) {
      allowedAttrs.push(`role="${roleMatch[1].toLowerCase()}"`);
    }

    // Extract type for input/button
    const typeMatch = rawAttrs.match(/\btype=["']([^"']+)["']/i);
    if (typeMatch && (tag === 'input' || tag === 'button')) {
      allowedAttrs.push(`type="${typeMatch[1].toLowerCase()}"`);
    }

    // Extract structural aria attributes
    const modalMatch = rawAttrs.match(/\baria-modal=["']([^"']+)["']/i);
    if (modalMatch) {
      allowedAttrs.push(`aria-modal="${modalMatch[1].toLowerCase()}"`);
    }

    const attrStr = allowedAttrs.length > 0 ? ' ' + allowedAttrs.join(' ') : '';
    return `<${tag}${attrStr}>`;
  });

  // 3. Remove all text content between tags
  cleaned = cleaned.replace(/>([^<]+)</g, '><');

  // 4. Compact whitespace
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Computes deterministic 64-bit SHA256 hex hash representation of DOM structure
 */
export function computeDomSkeletonHash(htmlOrSkeleton: string): string {
  const skeleton = extractStructuralSkeleton(htmlOrSkeleton);
  return crypto.createHash('sha256').update(skeleton).digest('hex').substring(0, 16);
}
