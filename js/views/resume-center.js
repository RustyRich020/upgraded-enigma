/* ============================================================
   views/resume-center.js — Resume management + PDF parsing
   Connected to ATS, search, and cover letter workflows.
   ============================================================ */

import { escapeHtml, uid } from '../utils.js';
import { SKILL_PATTERNS, CDN } from '../config.js';
import { toast } from '../components/toast.js';

/**
 * Render the resume center view.
 */
export function renderResumeCenter(container, state) {
  const resumes = (state.get('resumes') || []).filter(r => r.id !== '_meta');

  container.innerHTML = `
    <div class="toolbar" style="margin-bottom:12px;">
      <h2>Resume Center</h2>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
        <label class="btn brand" style="cursor:pointer;">
          <input id="resumeFileInput" type="file" accept=".pdf,.txt" hidden>
          Upload Resume (PDF)
        </label>
      </div>
    </div>

    ${resumes.length === 0 ? `
      <div class="panel" style="text-align:center;padding:48px 20px;">
        <div style="font-size:40px;margin-bottom:12px;opacity:0.3;">📄</div>
        <h3 style="margin-bottom:8px;">Upload your resume to get started</h3>
        <p class="muted" style="margin-bottom:20px;">Parse a PDF to extract skills, then find matching jobs and optimize your ATS score.</p>
        <label class="btn brand large" style="cursor:pointer;">
          <input id="resumeFileInput2" type="file" accept=".pdf,.txt" hidden>
          Upload Resume (PDF)
        </label>
      </div>
    ` : resumes.map(r => {
      const skillCount = (r.skills || []).length;
      const hasText = (r.text || '').length > 50;
      return `
        <div class="panel" style="margin-bottom:14px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
            <div>
              <h3 style="margin-bottom:2px;letter-spacing:0;text-transform:none;">${escapeHtml(r.name)}</h3>
              <span class="muted" style="font-size:12px;">${skillCount} skills${hasText ? ' · Full text stored' : ''}</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn small brand" data-act="analyze" data-rid="${r.id}">ATS Check</button>
              <button class="btn small" data-act="search" data-rid="${r.id}">Find Jobs</button>
              <button class="btn small" data-act="cover" data-rid="${r.id}">Cover Letter</button>
              <button class="btn small" data-act="edit" data-rid="${r.id}">Edit Skills</button>
              <button class="btn small danger" data-act="delete" data-rid="${r.id}">Delete</button>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${(r.skills || []).map(s => `
              <span class="chip">${escapeHtml(s)} <button data-act="rmskill" data-rid="${r.id}" data-skill="${escapeHtml(s)}" style="background:none;border:none;color:var(--color-muted);cursor:pointer;font-size:14px;padding:0 2px;">&times;</button></span>
            `).join('')}
            ${skillCount === 0 ? '<span class="muted">No skills — upload PDF or add manually</span>' : ''}
          </div>
          <div id="editor-${r.id}" style="display:none;margin-top:8px;">
            <input class="input" data-addskill="${r.id}" placeholder="Type a skill and press Enter" style="font-size:14px;">
          </div>
        </div>
      `;
    }).join('')}

    <div id="resumeParseResult" class="panel" style="margin-top:16px;display:none;">
      <h3>Parsed Resume</h3>
      <div id="resumeParseContent" class="muted" style="white-space:pre-wrap;font-size:13px;max-height:200px;overflow-y:auto;margin-bottom:12px;"></div>
      <h4>Extracted Skills</h4>
      <div id="resumeSkills" style="margin-bottom:16px;"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn brand" id="parseNextATS">Check ATS Score →</button>
        <button class="btn" id="parseNextSearch">Find Matching Jobs →</button>
      </div>
    </div>
  `;

  // File inputs
  [container.querySelector('#resumeFileInput'), container.querySelector('#resumeFileInput2')].forEach(input => {
    if (input) input.onchange = (e) => handlePDF(e, container, state);
  });

  // Action buttons
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const id = btn.dataset.rid;
    const resume = resumes.find(r => r.id === id);

    if (act === 'analyze') {
      window.location.hash = '#find-jobs';
      setTimeout(() => document.querySelector('.view-tab[data-tab="ats"]')?.click(), 200);
    }
    if (act === 'search') {
      const kw = (resume?.skills || []).slice(0, 3).join(' ');
      window.location.hash = '#find-jobs';
      setTimeout(() => {
        const kwEl = document.getElementById('searchKeyword');
        if (kwEl && kw) { kwEl.value = kw; kwEl.focus(); }
      }, 300);
    }
    if (act === 'cover') {
      window.location.hash = '#my-profile';
      setTimeout(() => {
        document.querySelector('.view-tab[data-tab="cover"]')?.click();
        setTimeout(() => {
          const el = document.getElementById('resumeText');
          if (el && resume?.text) el.value = resume.text.slice(0, 3000);
        }, 100);
      }, 200);
    }
    if (act === 'edit') {
      const ed = container.querySelector(`#editor-${id}`);
      if (ed) ed.style.display = ed.style.display === 'none' ? 'block' : 'none';
    }
    if (act === 'delete') {
      if (confirm(`Delete "${resume?.name}"?`)) {
        state.set('resumes', resumes.filter(r => r.id !== id));
        renderResumeCenter(container, state);
      }
    }
    if (act === 'rmskill') {
      const skill = btn.dataset.skill;
      const list = state.get('resumes') || [];
      const rec = list.find(r => r.id === id);
      if (rec) {
        rec.skills = (rec.skills || []).filter(s => s !== skill);
        state.set('resumes', list);
        renderResumeCenter(container, state);
      }
    }
  });

  // Add skill on Enter
  container.querySelectorAll('[data-addskill]').forEach(input => {
    input.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      const id = input.dataset.addskill;
      const skill = input.value.trim().toLowerCase();
      if (!skill) return;
      const list = state.get('resumes') || [];
      const rec = list.find(r => r.id === id);
      if (rec) {
        if (!rec.skills) rec.skills = [];
        if (!rec.skills.includes(skill)) {
          rec.skills.push(skill);
          state.set('resumes', list);
          renderResumeCenter(container, state);
          toast(`Added "${skill}"`, 'success');
        }
      }
    };
  });

  // Parse result next buttons
  container.querySelector('#parseNextATS')?.addEventListener('click', () => {
    window.location.hash = '#find-jobs';
    setTimeout(() => document.querySelector('.view-tab[data-tab="ats"]')?.click(), 200);
  });
  container.querySelector('#parseNextSearch')?.addEventListener('click', () => {
    window.location.hash = '#find-jobs';
  });
}

async function handlePDF(e, container, state) {
  const file = e.target.files[0];
  if (!file) return;
  toast('Parsing PDF...', 'info');
  try {
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) throw new Error('PDF.js not loaded');
    const buf = await file.arrayBuffer();
    pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfJsWorker;
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    const skills = [...new Set((text.match(SKILL_PATTERNS) || []).map(s => s.toLowerCase()))];
    const name = file.name.replace(/\.pdf$/i, '');
    const list = state.get('resumes') || [];
    list.push({ id: uid(), name, skills, text: text.slice(0, 5000) });
    state.set('resumes', list);

    const pr = container.querySelector('#resumeParseResult');
    const pc = container.querySelector('#resumeParseContent');
    const sk = container.querySelector('#resumeSkills');
    if (pr) pr.style.display = 'block';
    if (pc) pc.textContent = text.slice(0, 1500);
    if (sk) sk.innerHTML = skills.map(s => `<span class="chip" style="margin:3px;background:var(--color-success-dim);color:var(--color-success);">${escapeHtml(s)}</span>`).join('') || '<span class="muted">No skills detected</span>';

    renderResumeCenter(container, state);
    toast(`Parsed "${name}" — ${skills.length} skills found`, 'success');
  } catch (err) {
    toast('PDF parse error: ' + err.message, 'error');
  }
  e.target.value = '';
}

export default { renderResumeCenter };
