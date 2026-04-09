/* ============================================================
   views/resume-center.js — Resume management + PDF parsing
   ============================================================ */

import { escapeHtml, uid } from '../utils.js';
import { SKILL_PATTERNS, CDN } from '../config.js';
import { toast } from '../components/toast.js';

/**
 * Render the resume center view.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 */
export function renderResumeCenter(container, state) {
  const resumes = state.get('resumes') || [];

  // Render resume table
  const tbody = container.querySelector('#resumeTable tbody');
  if (tbody) {
    if (resumes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state"><div class="empty-state-icon">&#128196;</div><h3>No resumes yet</h3><p>Add resume names or parse a PDF to extract skills</p></div></td></tr>`;
    } else {
      tbody.innerHTML = resumes.map(r => `
        <tr>
          <td>${escapeHtml(r.name)}</td>
          <td>${(r.skills || []).map(s => `<span class="chip" style="margin:2px">${escapeHtml(s)}</span>`).join(' ') || '<span class="muted">---</span>'}</td>
          <td style="white-space:nowrap">
            <button class="btn small" data-r="${r.id}" data-act="copy">COPY</button>
            <button class="btn small" data-r="${r.id}" data-act="rename">RENAME</button>
            <button class="btn danger small" data-r="${r.id}" data-act="del">DEL</button>
          </td>
        </tr>
      `).join('');
    }
  }

  // Add resume button
  const addBtn = container.querySelector('#addResume');
  if (addBtn) {
    addBtn.onclick = () => {
      const nameEl = container.querySelector('#resumeName');
      const name = (nameEl?.value || '').trim();
      if (!name) return;
      const list = state.get('resumes') || [];
      list.push({ id: uid(), name, skills: [], text: '' });
      state.set('resumes', list);
      if (nameEl) nameEl.value = '';
      renderResumeCenter(container, state);
    };
  }

  // Table actions
  const table = container.querySelector('#resumeTable');
  if (table) {
    table.onclick = (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const id = btn.getAttribute('data-r');
      const act = btn.getAttribute('data-act');
      const list = state.get('resumes') || [];

      if (act === 'del') {
        state.set('resumes', list.filter(x => x.id !== id));
        renderResumeCenter(container, state);
      }
      if (act === 'rename') {
        const rec = list.find(x => x.id === id);
        const nn = prompt('New name', rec?.name || '');
        if (nn && rec) {
          rec.name = nn;
          state.set('resumes', list);
          renderResumeCenter(container, state);
        }
      }
      if (act === 'copy') {
        const rec = list.find(x => x.id === id);
        if (rec) {
          list.push({ id: uid(), name: (rec.name || 'Untitled') + ' Copy', skills: [...(rec.skills || [])], text: rec.text || '' });
          state.set('resumes', list);
          renderResumeCenter(container, state);
        }
      }
    };
  }

  // PDF file input
  const fileInput = container.querySelector('#resumeFileInput');
  if (fileInput) {
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      toast('Parsing PDF...', 'info');

      try {
        const pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) throw new Error('PDF.js not loaded');

        const arrayBuf = await file.arrayBuffer();
        pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfJsWorker;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(' ') + '\n';
        }

        // Extract skills
        const foundSkills = [...new Set((fullText.match(SKILL_PATTERNS) || []).map(s => s.toLowerCase()))];

        // Save as resume
        const name = file.name.replace(/\.pdf$/i, '');
        const list = state.get('resumes') || [];
        list.push({ id: uid(), name, skills: foundSkills, text: fullText.slice(0, 5000) });
        state.set('resumes', list);

        // Show parsed content
        const parseResult = container.querySelector('#resumeParseResult');
        const parseContent = container.querySelector('#resumeParseContent');
        const skillsEl = container.querySelector('#resumeSkills');

        if (parseResult) parseResult.style.display = 'block';
        if (parseContent) {
          parseContent.textContent = fullText.slice(0, 2000) + (fullText.length > 2000 ? '\n...[truncated]' : '');
        }
        if (skillsEl) {
          skillsEl.innerHTML = foundSkills.map(s => `<span class="chip" style="margin:4px">${escapeHtml(s)}</span>`).join(' ')
            || '<span class="muted">No tech skills detected</span>';
        }

        renderResumeCenter(container, state);
        toast(`Parsed "${name}" - ${foundSkills.length} skills found`, 'success');
      } catch (err) {
        toast('PDF parse error: ' + err.message, 'error');
      }
      e.target.value = '';
    };
  }
}

export default { renderResumeCenter };
