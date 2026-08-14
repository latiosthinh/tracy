import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageName, url, apiKey, selectedModel, pageElements, projectName } = req.body;

  if (!pageName) {
    return res.status(400).json({ error: 'Missing "pageName" field.' });
  }

  try {
    const genai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || '' });

    const model = selectedModel && selectedModel !== 'auto' ? selectedModel : 'gemini-2.5-flash';

    const elementsDescription = (pageElements || [])
      .map(e => {
        const parts = [];
        if (e.testId) parts.push(`testId="${e.testId}"`);
        if (e.text) parts.push(`text="${e.text}"`);
        if (e.label) parts.push(`label="${e.label}"`);
        if (e.placeholder) parts.push(`placeholder="${e.placeholder}"`);
        if (e.role) parts.push(`role=${e.role}`);
        return `Element [${parts.join(' | ')}]`;
      })
      .join('\n');

    const fullPrompt = `You are a test automation assistant for Tracy. Generate at least 3-5 E2E test flows as JSON array.

Page Name: ${pageName}
Target URL: ${url || 'https://example.com'}
Detected Elements:
${elementsDescription || '(none provided)'}

Output format:
[
  {
    "name": "<flow-name.yaml>",
    "yaml": "<tracy-yaml-content>",
    "description": "<what this flow tests>"
  }
]`;

    const result = await genai.models.generateContent({
      model: `models/${model}`,
      contents: fullPrompt,
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    });

    const text = result.text?.trim() || '';
    let flows = [];

    try {
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        flows = parsed.filter(f => f.name && f.yaml);
      }
    } catch {
      flows = [{
        name: `${pageName.toLowerCase().replace(/\s+/g, '-')}-suite.yaml`,
        yaml: text,
        description: `Auto-generated suite for ${pageName}`,
      }];
    }

    return res.json({ flows });
  } catch (err) {
    console.error('[auto-suite] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Generation failed' });
  }
}
