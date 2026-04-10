/* ============================================================
   services/ai-groq.js — Groq Cloud API (fast LLM inference)
   Free tier available. Alternative to Gemini.
   Docs: https://console.groq.com/docs/api-reference
   ============================================================ */

import { ENDPOINTS } from '../config.js';

/**
 * Call Groq API for text generation.
 * @param {string} prompt — the user prompt
 * @param {string} apiKey — Groq API key
 * @param {string} model — model name (default: llama-3.3-70b-versatile)
 * @returns {string} generated text
 */
export async function callGroq(prompt, apiKey, model = 'llama-3.3-70b-versatile') {
  if (!apiKey) throw new Error('Groq API key not configured');
  const resp = await fetch(ENDPOINTS.groq, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048
    })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Groq API error ' + resp.status);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || 'No response generated';
}

export default { callGroq };
