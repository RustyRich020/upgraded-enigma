/* ============================================================
   views/salary-tool.js — Salary Negotiation Tool
   ============================================================ */

import { escapeHtml, uid } from '../utils.js';
import { toast } from '../components/toast.js';
import { EmptyState } from '../ui/empty-state.js';

/**
 * Render the salary negotiation / offer comparison tool.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 */
export function renderSalaryTool(container, state) {
  const offers = state.get('offers') || [];

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="margin:0">Salary Negotiation Tool</h2>
      <button class="btn" id="toggleOfferForm"${offers.length >= 3 ? ' disabled title="Max 3 offers"' : ''}>+ ADD OFFER</button>
    </div>

    <div id="offerFormWrap" style="display:none;margin-bottom:20px;padding:16px;border:1px solid var(--border);border-radius:8px;background:var(--surface)">
      <h3 style="margin:0 0 12px">Add Offer</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
        <div>
          <label class="label">Company *</label>
          <input type="text" class="input" id="offerCompany" placeholder="Acme Corp">
        </div>
        <div>
          <label class="label">Role</label>
          <input type="text" class="input" id="offerRole" placeholder="Software Engineer">
        </div>
        <div>
          <label class="label">Base Salary ($) *</label>
          <input type="number" class="input" id="offerBase" placeholder="120000" min="0">
        </div>
        <div>
          <label class="label">Bonus ($)</label>
          <input type="number" class="input" id="offerBonus" placeholder="15000" min="0">
        </div>
        <div>
          <label class="label">Equity ($/yr est.)</label>
          <input type="number" class="input" id="offerEquity" placeholder="25000" min="0">
        </div>
        <div>
          <label class="label">Benefits Score (1-5)</label>
          <input type="number" class="input" id="offerBenefits" placeholder="4" min="1" max="5">
        </div>
        <div>
          <label class="label">PTO Days</label>
          <input type="number" class="input" id="offerPto" placeholder="20" min="0">
        </div>
        <div>
          <label class="label">Remote?</label>
          <select class="input" id="offerRemote">
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div>
          <label class="label">Commute (min)</label>
          <input type="number" class="input" id="offerCommute" placeholder="30" min="0">
        </div>
      </div>
      <div style="margin-top:10px">
        <label class="label">Notes</label>
        <textarea class="input" id="offerNotes" rows="2" placeholder="Signing bonus, relocation, perks..."></textarea>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn" id="saveOffer">SAVE</button>
        <button class="btn" id="cancelOffer">CANCEL</button>
      </div>
    </div>

    ${offers.length === 0
      ? EmptyState({ icon: '\u{1F4B0}', title: 'No offers to compare', description: 'Add up to 3 offers to compare side by side' })
      : `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px" id="offerCards">
          ${offers.map(o => renderOfferCard(o)).join('')}
        </div>
        <div style="margin-bottom:24px">
          <h3>Total Compensation Comparison</h3>
          <div style="max-width:600px;margin:0 auto">
            <canvas id="salaryChart" height="300"></canvas>
          </div>
        </div>
      `
    }
  `;

  /* --- Toggle form --- */
  const toggleBtn = container.querySelector('#toggleOfferForm');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      if (offers.length >= 3) {
        toast('Maximum 3 offers allowed', 'error');
        return;
      }
      const wrap = container.querySelector('#offerFormWrap');
      wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
    };
  }
  container.querySelector('#cancelOffer')?.addEventListener('click', () => {
    container.querySelector('#offerFormWrap').style.display = 'none';
  });

  /* --- Save offer --- */
  container.querySelector('#saveOffer')?.addEventListener('click', () => {
    const company = (container.querySelector('#offerCompany')?.value || '').trim();
    const baseSalary = parseFloat(container.querySelector('#offerBase')?.value) || 0;

    if (!company || !baseSalary) {
      toast('Company and base salary are required', 'error');
      return;
    }
    if (offers.length >= 3) {
      toast('Maximum 3 offers allowed', 'error');
      return;
    }

    const list = state.get('offers') || [];
    list.push({
      id: uid(),
      company,
      role: (container.querySelector('#offerRole')?.value || '').trim(),
      baseSalary,
      bonus: parseFloat(container.querySelector('#offerBonus')?.value) || 0,
      equity: parseFloat(container.querySelector('#offerEquity')?.value) || 0,
      benefits: parseInt(container.querySelector('#offerBenefits')?.value) || 3,
      pto: parseInt(container.querySelector('#offerPto')?.value) || 0,
      remote: container.querySelector('#offerRemote')?.value || 'no',
      commute: parseInt(container.querySelector('#offerCommute')?.value) || 0,
      notes: container.querySelector('#offerNotes')?.value || '',
      createdAt: new Date().toISOString()
    });
    state.set('offers', list);
    toast('Offer added', 'success');
    renderSalaryTool(container, state);
  });

  /* --- Delete offer delegation --- */
  container.querySelector('#offerCards')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act="delOffer"]');
    if (!btn) return;
    const id = btn.dataset.id;
    const list = state.get('offers') || [];
    state.set('offers', list.filter(x => x.id !== id));
    toast('Offer removed', 'info');
    renderSalaryTool(container, state);
  });

  /* --- Chart --- */
  if (offers.length > 0) {
    renderChart(container, offers);
  }
}

function totalComp(o) {
  return (o.baseSalary || 0) + (o.bonus || 0) + (o.equity || 0);
}

function renderOfferCard(o) {
  const tc = totalComp(o);
  const stars = '&#9733;'.repeat(Math.min(o.benefits || 0, 5)) + '&#9734;'.repeat(Math.max(5 - (o.benefits || 0), 0));
  const remoteLabel = { yes: 'Remote', no: 'On-site', hybrid: 'Hybrid' }[o.remote] || o.remote;

  return `
    <div style="border:1px solid var(--border);border-radius:8px;padding:16px;background:var(--surface);position:relative">
      <button class="btn danger small" data-act="delOffer" data-id="${o.id}" style="position:absolute;top:8px;right:8px;font-size:10px">X</button>
      <div style="font-weight:700;font-size:16px;margin-bottom:2px">${escapeHtml(o.company)}</div>
      <div class="muted" style="font-size:13px;margin-bottom:12px">${escapeHtml(o.role || '')}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px">
        <div>Base Salary</div><div style="font-weight:600">$${Number(o.baseSalary).toLocaleString()}</div>
        <div>Bonus</div><div style="font-weight:600">$${Number(o.bonus || 0).toLocaleString()}</div>
        <div>Equity (est.)</div><div style="font-weight:600">$${Number(o.equity || 0).toLocaleString()}</div>
        <div style="border-top:1px solid var(--border);padding-top:4px;font-weight:700">Total Comp</div>
        <div style="border-top:1px solid var(--border);padding-top:4px;font-weight:700;color:var(--accent, #ff9800)">$${tc.toLocaleString()}</div>
        <div>Benefits</div><div style="font-size:14px">${stars}</div>
        <div>PTO</div><div>${o.pto || 0} days</div>
        <div>Work Mode</div><div>${escapeHtml(remoteLabel)}</div>
        ${o.commute ? `<div>Commute</div><div>${o.commute} min</div>` : ''}
      </div>
      ${o.notes ? `<div style="margin-top:10px;font-size:12px;color:var(--muted);border-top:1px solid var(--border);padding-top:8px">${escapeHtml(o.notes)}</div>` : ''}
    </div>
  `;
}

function renderChart(container, offers) {
  const canvas = container.querySelector('#salaryChart');
  if (!canvas) return;

  const Chart = window.Chart;
  if (!Chart) {
    canvas.parentElement.innerHTML = '<p class="muted" style="text-align:center">Chart.js not loaded. Include Chart.js to see the comparison chart.</p>';
    return;
  }

  const labels = offers.map(o => o.company || 'Offer');
  const baseData = offers.map(o => o.baseSalary || 0);
  const bonusData = offers.map(o => o.bonus || 0);
  const equityData = offers.map(o => o.equity || 0);

  new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Base Salary', data: baseData, backgroundColor: '#2196F3' },
        { label: 'Bonus', data: bonusData, backgroundColor: '#4CAF50' },
        { label: 'Equity', data: equityData, backgroundColor: '#FF9800' }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: false }
      },
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          ticks: {
            callback: function(value) {
              return '$' + Number(value).toLocaleString();
            }
          }
        }
      }
    }
  });
}

export default { renderSalaryTool };
