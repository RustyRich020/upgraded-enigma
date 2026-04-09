/* ============================================================
   services/ai-gemini.js — Google Gemini API integration
   ============================================================ */

import { ENDPOINTS } from '../config.js';

/**
 * Call the Gemini 2.0 Flash model with a text prompt.
 * @param {string} prompt — the prompt text
 * @param {string} apiKey — Gemini API key
 * @returns {string} generated text response
 */
export async function callGemini(prompt, apiKey) {
  if (!apiKey) throw new Error('Gemini API key not configured — go to Settings');

  const url = `${ENDPOINTS.gemini}?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gemini API error ' + resp.status);
  }

  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
}

export default { callGemini };
