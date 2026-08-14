import { Router } from 'express';

const router = Router();

// Prompt template for generating test YAML flows
const SYSTEM_PROMPT = `You are a test automation assistant. Given a description and target URL, produce a valid Tracy YAML E2E test flow.

Follow this exact output format — ONLY output YAML, no explanation or markdown wrapping:
url: <targetUrl>
tags:
  - e2e
---
- navigate: /
- leftClick: "<element text>"
- fill:
    selector: "input[name=email]"
    text: "user@example.com"
- press: Enter
- assertVisible: "Confirmation"
- assertTitle: "Welcome"

Supported commands: navigate, leftClick, rightClick, hover, scroll, tap, twoFingersTap, press, fill, waitFor
For 'fill', use selector (CSS/XPath) and text attributes.
For 'press', use key attribute (Enter, Tab, Escape, etc.).`;

function extractApiKey(agentProvider) {
  // API keys come from the request body in BYOK mode
  return null;
}

router.post('/', async (req, res) => {
  const {
    prompt,
    targetUrl,
    copilotScope,
    projectName,
    projectFlows,
    agentProvider,
    apiKey,
    customEndpoint,
    selectedModel,
  } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "prompt" field.' });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');

    const genai = new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY || '',
    });

    const fullPrompt = `${SYSTEM_PROMPT}

Project: ${projectName || 'Untitled'}
Target URL: ${targetUrl || 'https://example.com'}
Scope: ${copilotScope || 'full flow'}

User prompt: ${prompt}

Previous flows in project (${projectFlows?.length || 0}):
${(projectFlows || []).map(f => `- ${f.name}: ${f.yamlContent}`).join('\n')}

Generate a complete, valid Tracy YAML test flow based on the user prompt. Return ONLY the YAML content.`;

    let model = 'gemini-2.5-flash';
    if (selectedModel && selectedModel !== 'auto') {
      model = selectedModel.startsWith('gemini-') ? selectedModel : `models/${selectedModel}`;
    } else {
      model = 'models/gemini-2.5-flash';
    }

    const result = await genai.models.generateContent({
      model,
      contents: fullPrompt,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
    });

    const yaml = result.text?.trim() || '';

    // Clean up markdown code block wrappers if present
    const cleanedYaml = yaml
      .replace(/^```yaml\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return res.json({ yaml: cleanedYaml });
  } catch (err) {
    console.error('[generate-flow] Error:', err.message);
    return res.status(500).json({
      error: err.message || 'Failed to generate test flow. Check API key configuration.',
    });
  }
});

export default router;
