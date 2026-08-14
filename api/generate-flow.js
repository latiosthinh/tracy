import { GoogleGenAI } from '@google/genai';

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

Supported commands: navigate, leftClick, rightClick, hover, scroll, tap, twoFingersTap, press, fill, waitFor`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, targetUrl, agentProvider, apiKey, selectedModel, copilotScope, projectName, projectFlows } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing "prompt" field.' });
  }

  try {
    const genai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || '' });

    const model = selectedModel && selectedModel !== 'auto' ? selectedModel : 'gemini-2.5-flash';

    const fullPrompt = `${SYSTEM_PROMPT}

Project: ${projectName || 'Untitled'}
Target URL: ${targetUrl || 'https://example.com'}
Scope: ${copilotScope || 'full flow'}

User prompt: ${prompt}`;

    const result = await genai.models.generateContent({
      model: `models/${model}`,
      contents: fullPrompt,
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
    });

    const yaml = (result.text || '')
      .replace(/^```yaml\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    return res.json({ yaml });
  } catch (err) {
    console.error('[generate-flow] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Generation failed' });
  }
}
