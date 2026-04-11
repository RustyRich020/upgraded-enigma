/* ============================================================
   views/ai-tools.js — AI analysis tools (local + Gemini)
   ============================================================ */

import { escapeHtml, keyset, today } from '../utils.js';
import { callGemini } from '../services/ai-gemini.js';
import { getApi, hasApi } from '../services/api-keys.js';
import { toast } from '../components/toast.js';
import { download } from '../utils.js';
import { checkLimit, recordUsage } from '../services/usage-tracker.js';
import { showUpgradeBanner } from '../components/upgrade-banner.js';

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

  // ---- Populate Job Description dropdown from tracked jobs ----
  const jdSelect = container.querySelector('#jdSelect');
  const jdText = container.querySelector('#jdText');
  if (jdSelect) {
    const jobs = (state.get('jobs') || []).filter(j => j.id && j.id !== '_meta' && j.title);
    jdSelect.innerHTML = '<option value="">— Select from My Jobs or paste below —</option>';
    jobs.forEach((j, i) => {
      const label = `${j.title || 'Untitled'}${j.company ? ' @ ' + j.company : ''}${j.source ? ' (' + j.source + ')' : ''}`;
      jdSelect.innerHTML += `<option value="${i}">${escapeHtml(label)}</option>`;
    });
    jdSelect.onchange = () => {
      const idx = parseInt(jdSelect.value);
      if (!isNaN(idx) && jobs[idx]) {
        const j = jobs[idx];
        // Build a JD-like text from the job data
        const parts = [];
        if (j.title) parts.push(`Title: ${j.title}`);
        if (j.company) parts.push(`Company: ${j.company}`);
        if (j.location) parts.push(`Location: ${j.location}`);
        if (j.salary) parts.push(`Salary: $${Number(j.salary).toLocaleString()}`);
        if (j.source) parts.push(`Source: ${j.source}`);
        if (j.description) parts.push(`\nDescription:\n${j.description}`);
        if (j.tags) parts.push(`\nSkills/Tags: ${j.tags}`);
        if (jdText) jdText.value = parts.join('\n');
      }
    };
  }

  // ---- Populate Resume dropdown from saved resumes ----
  const resumeSelect = container.querySelector('#resumeSelect');
  const resumeText = container.querySelector('#resumeText');
  if (resumeSelect) {
    const resumes = (state.get('resumes') || []).filter(r => r.id && r.id !== '_meta');
    resumeSelect.innerHTML = '<option value="">— Select from My Resumes or paste below —</option>';
    resumes.forEach((r, i) => {
      const skills = (r.skills || []).slice(0, 5).join(', ');
      const label = `${r.name || 'Untitled'}${skills ? ' — ' + skills + '...' : ''}`;
      resumeSelect.innerHTML += `<option value="${i}">${escapeHtml(label)}</option>`;
    });
    resumeSelect.onchange = () => {
      const idx = parseInt(resumeSelect.value);
      if (!isNaN(idx) && resumes[idx]) {
        const r = resumes[idx];
        if (r.text && resumeText) {
          resumeText.value = r.text.slice(0, 4000);
        } else if (r.skills?.length && resumeText) {
          // Fallback: build text from skills + name
          resumeText.value = `${r.name || 'Resume'}\n\nSkills: ${r.skills.join(', ')}`;
        }
      }
    };
  }

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
      const { allowed } = checkLimit('gemini');
      if (!allowed) { showUpgradeBanner(container, 'gemini'); return; }
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
        recordUsage('gemini');
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
      const { allowed } = checkLimit('gemini');
      if (!allowed) { showUpgradeBanner(container, 'gemini'); return; }
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
        recordUsage('gemini');
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

  // Interview Questions Generator
  const interviewBtn = container.querySelector('#genInterviewQuestions');
  if (interviewBtn) {
    interviewBtn.onclick = async () => {
      const jdText = (container.querySelector('#jdText')?.value || '').trim();
      if (!jdText) { toast('Paste a Job Description first', 'error'); return; }
      if (!hasApi('geminiKey')) { toast('Configure Gemini API key in Settings', 'error'); return; }

      interviewBtn.disabled = true;
      interviewBtn.innerHTML = '<span class="spinner"></span>';
      try {
        const prompt = `Based on this job description, generate 10 likely interview questions the candidate should prepare for. Include a mix of:
- 3 behavioral questions (STAR method)
- 3 technical questions specific to the role
- 2 situational questions
- 2 questions the candidate should ask the interviewer

JOB DESCRIPTION:
${jdText.slice(0, 2500)}

Format each question with a number and category label. For technical questions, include a brief hint about what a good answer covers.`;

        const result = await callGemini(prompt, getApi('geminiKey'));
        recordUsage('gemini');
        const coverOut = container.querySelector('#coverOut');
        if (coverOut) coverOut.value = result;
        const blob = new Blob([result], { type: 'text/plain' });
        const dlLink = container.querySelector('#dlCover');
        if (dlLink) { dlLink.href = URL.createObjectURL(blob); dlLink.download = 'interview-questions.txt'; }
        toast('Interview questions generated', 'success');
      } catch (err) {
        toast('AI error: ' + err.message, 'error');
      } finally {
        interviewBtn.disabled = false;
        interviewBtn.textContent = 'INTERVIEW QUESTIONS';
      }
    };
  }
}

export default { renderAiTools };
