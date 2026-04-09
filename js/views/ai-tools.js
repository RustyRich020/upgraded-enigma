/* ============================================================
   views/ai-tools.js — AI analysis tools (local + Gemini)
   ============================================================ */

import { escapeHtml, keyset, today } from '../utils.js';
import { callGemini } from '../services/ai-gemini.js';
import { getApi, hasApi } from '../services/api-keys.js';
import { toast } from '../components/toast.js';
import { download } from '../utils.js';

/**
 * Render the AI tools view.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 * @param {Function} addJob — callback to add a job
 */
export function renderAiTools(container, state, addJob) {
  // Show/hide AI mode indicator
  const aiMode = container.querySelector('#aiMode');
  if (aiMode) aiMode.style.display = hasApi('geminiKey') ? '' : 'none';

  // Local analysis button
  const analyzeBtn = container.querySelector('#analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.onclick = () => {
      const jdText = container.querySelector('#jdText')?.value || '';
      const resumeText = container.querySelector('#resumeText')?.value || '';
      const jd = keyset(jdText);
      const rv = keyset(resumeText);
      const found = [...jd].filter(k => rv.has(k));
      const missing = [...jd].filter(k => !rv.has(k));
      const score = Math.round(100 * (found.length / Math.max(1, found.length + missing.length)));

      const scoreEl = container.querySelector('#matchScore');
      if (scoreEl) scoreEl.textContent = score;

      const foundEl = container.querySelector('#foundList');
      if (foundEl) {
        foundEl.innerHTML = found.map(k => `<span class="chip" style="margin:4px">${escapeHtml(k)}</span>`).join(' ');
      }

      const missingEl = container.querySelector('#missingList');
      if (missingEl) {
        missingEl.innerHTML = missing.map(k =>
          `<span class="chip" style="margin:4px;background:rgba(255,0,0,0.1);border-color:#ff0000;color:#ff6666">${escapeHtml(k)}</span>`
        ).join(' ');
      }

      const aiResult = container.querySelector('#aiMatchResult');
      if (aiResult) aiResult.style.display = 'none';
    };
  }

  // AI analysis button
  const analyzeAiBtn = container.querySelector('#analyzeAiBtn');
  if (analyzeAiBtn) {
    analyzeAiBtn.onclick = async () => {
      const jdText = (container.querySelector('#jdText')?.value || '').trim();
      const resumeText = (container.querySelector('#resumeText')?.value || '').trim();
      if (!jdText || !resumeText) { toast('Paste both JD and Resume first', 'error'); return; }

      analyzeAiBtn.disabled = true;
      analyzeAiBtn.innerHTML = '<span class="spinner"></span>';
      try {
        const prompt = `You are a career advisor AI. Analyze the match between this job description and resume.

JOB DESCRIPTION:
${jdText.slice(0, 3000)}

RESUME:
${resumeText.slice(0, 3000)}

Provide:
1. Match score (0-100%)
2. Top 5 matching strengths
3. Top 5 gaps/missing skills
4. 3 specific suggestions to improve the resume for this role
5. Brief overall assessment (2-3 sentences)

Format your response clearly with headers.`;

        const result = await callGemini(prompt, getApi('geminiKey'));
        const aiResult = container.querySelector('#aiMatchResult');
        const aiContent = container.querySelector('#aiMatchContent');
        if (aiResult) aiResult.style.display = 'block';
        if (aiContent) aiContent.textContent = result;

        const scoreMatch = result.match(/(\d{1,3})\s*%/);
        if (scoreMatch) {
          const scoreEl = container.querySelector('#matchScore');
          if (scoreEl) scoreEl.textContent = scoreMatch[1];
        }
        toast('AI analysis complete', 'success');
      } catch (err) {
        toast('AI error: ' + err.message, 'error');
      } finally {
        analyzeAiBtn.disabled = false;
        analyzeAiBtn.textContent = 'ANALYZE (AI)';
      }
    };
  }

  // Local cover letter
  const draftBtn = container.querySelector('#draftCoverLetter');
  if (draftBtn) {
    draftBtn.onclick = () => {
      const jobs = state.get('jobs') || [];
      const settings = state.get('settings') || {};
      const name = settings.name || 'Hiring Manager';
      const lastJob = jobs[jobs.length - 1];
      const role = lastJob?.title || 'the role';
      const company = lastJob?.company || 'your company';
      const body = `Dear ${name},\n\nI'm excited to apply for ${role} at ${company}. My experience aligns with the role's requirements, including [top skills]. I thrive in fast-moving teams and care deeply about measurable impact.\n\nHighlights:\n- Achievement 1 (quantified)\n- Achievement 2 (quantified)\n- Achievement 3 (quantified)\n\nI'd welcome the opportunity to discuss how I can contribute.\n\nBest,\nYour Name`;

      const coverOut = container.querySelector('#coverOut');
      if (coverOut) coverOut.value = body;
      const dlLink = container.querySelector('#dlCover');
      if (dlLink) dlLink.href = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
    };
  }

  // AI cover letter
  const draftAiBtn = container.querySelector('#draftCoverLetterAi');
  if (draftAiBtn) {
    draftAiBtn.onclick = async () => {
      const jdText = (container.querySelector('#jdText')?.value || '').trim();
      const resumeText = (container.querySelector('#resumeText')?.value || '').trim();
      if (!jdText) { toast('Paste a Job Description first', 'error'); return; }

      draftAiBtn.disabled = true;
      draftAiBtn.innerHTML = '<span class="spinner"></span>';
      try {
        const prompt = `Write a professional, compelling cover letter for this job. ${resumeText ? 'Use the resume details provided.' : 'Use placeholder achievements.'}

JOB DESCRIPTION:
${jdText.slice(0, 2000)}

${resumeText ? 'RESUME:\n' + resumeText.slice(0, 2000) : ''}

Write a 3-4 paragraph cover letter that:
- Opens with enthusiasm for the specific role
- Highlights 2-3 relevant achievements with metrics
- Shows knowledge of the company
- Closes with a call to action
Keep it under 300 words. Professional but personable tone.`;

        const result = await callGemini(prompt, getApi('geminiKey'));
        const coverOut = container.querySelector('#coverOut');
        if (coverOut) coverOut.value = result;
        const dlLink = container.querySelector('#dlCover');
        if (dlLink) dlLink.href = URL.createObjectURL(new Blob([result], { type: 'text/plain' }));
        toast('AI cover letter generated', 'success');
      } catch (err) {
        toast('AI error: ' + err.message, 'error');
      } finally {
        draftAiBtn.disabled = false;
        draftAiBtn.textContent = 'COVER LETTER (AI)';
      }
    };
  }

  // Job from JD
  const jdBtn = container.querySelector('#createJobFromJd');
  if (jdBtn) {
    jdBtn.onclick = () => {
      const jdText = container.querySelector('#jdText')?.value || '';
      if (!jdText) { toast('Paste a JD first', 'error'); return; }

      const mTitle = jdText.match(/Title\s*:\s*(.+)/i) || jdText.match(/\b(Engineer|Analyst|Manager|Designer|Developer|Scientist)\b/i);
      const mComp = jdText.match(/Company\s*:\s*(.+)/i) || jdText.match(/\b(?:at|@)\s+([A-Z][A-Za-z0-9& ]{2,})/);

      addJob({
        title: mTitle ? (mTitle[1] || mTitle[0]).trim() : 'Untitled Role',
        company: mComp ? (mComp[1] || '').trim() : '',
        status: 'Saved',
        source: 'Parsed JD',
        follow: today(3)
      });
      toast('Job created from JD', 'success');
    };
  }
}

export default { renderAiTools };
