import { Router } from 'express';

const router = Router();

router.post('/', async (req, res) => {
  const {
    pageName,
    url,
    projectName,
    agentProvider,
    apiKey,
    customEndpoint,
    selectedModel,
    pageElements,
  } = req.body;

  if (!pageName || typeof pageName !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "pageName" field.' });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');

    const genai = new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY || '',
    });

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

    const fullPrompt = `You are a test automation assistant for Tracy. Given a page name and target URL, generate a comprehensive suite of E2E test flows covering common user journeys.

Page Name: ${pageName}
Target URL: ${url || 'https://example.com'}
Detected Elements:
${elementsDescription || '(none provided)'}

For each flow, output in this exact JSON-like format with YAML content:

[
  {
    "name": "<flow-name.yaml>",
    "yaml": "<full-tracy-yaml-content>",
    "description": "<what this flow tests>"
  }
]

Generate at least 3-5 flows covering:
1. Landing page load / homepage navigation
2. Core user journey (e.g., search, browse, add to cart)
3. Form submission / checkout flow
4. Error handling / edge cases
5. Success confirmation / post-action state

Each YAML must use these commands only: navigate, leftClick, rightClick, hover, scroll, tap, twoFingersTap, press, fill, waitFor
Include proper selector attributes for all interactive elements.`;

    let model = 'models/gemini-2.5-flash';
    if (selectedModel && selectedModel !== 'auto') {
      model = selectedModel.startsWith('gemini-') ? selectedModel : `models/${selectedModel}`;
    }

    const result = await genai.models.generateContent({
      model,
      contents: fullPrompt,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    });

    const text = result.text?.trim() || '';

    // Try to parse as JSON array first, fall back to returning structured object
    let flows = [];
    try {
      // Strip markdown code blocks if present
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        flows = parsed.filter(f => f.name && f.yaml);
      }
    } catch {
      // If not valid JSON, wrap the raw text as a single flow
      flows = [{
        name: `${pageName.toLowerCase().replace(/\s+/g, '-')}-suite.yaml`,
        yaml: text,
        description: `Auto-generated suite for ${pageName}`,
      }];
    }

    return res.json({ flows });
  } catch (err) {
    console.error('[auto-suite] Error:', err.message);
    return res.status(500).json({
      error: err.message || 'Failed to generate test suite. Check API key configuration.',
    });
  }
});

export default router;
