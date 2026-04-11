/* ============================================================
   services/jd-intelligence.js — JD Extraction, Comparison
   & Skill Demand Intelligence

   Auto-extracts structured data from job postings, compares
   multiple jobs side-by-side, and generates skill heatmaps
   from search result collections.
   ============================================================ */

import { escapeHtml } from '../utils.js';
import atsEngine, {
  scoreATSAlignment, extractATSKeywords,
} from './ats-optimizer.js';

const { ATS_PATTERNS } = atsEngine;

/* ============================================================
   Section header patterns used by extractJobDetails
   ============================================================ */

const SECTION_PATTERNS = {
  requirements: /(?:requirements|qualifications|what you(?:'ll)? need|must have|minimum qualifications|required skills)[:\s]*/i,
  preferred: /(?:preferred|nice to have|bonus|desired|plus|preferred qualifications)[:\s]*/i,
  responsibilities: /(?:responsibilities|what you(?:'ll)? do|duties|role|about the role|job duties|key responsibilities)[:\s]*/i,
  benefits: /(?:benefits|perks|what we offer|compensation|why join)[:\s]*/i,
};

const SALARY_PATTERN = /\$\s*([\d,]+(?:\.\d{2})?)\s*(?:[-\u2013]\s*\$\s*([\d,]+(?:\.\d{2})?))?(?:\s*(?:\/|per)\s*(?:year|yr|annum|annually|hour|hr))?/i;
const EXPERIENCE_PATTERN = /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i;
const EDUCATION_PATTERN = /(?:bachelor|master|phd|doctorate|associate|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?b\.?a\.?|degree)\s*(?:in\s+[\w\s]+)?/i;
const REMOTE_PATTERN = /\b(remote|hybrid|on-?\s?site|in-?\s?office|work from home|wfh|distributed)\b/i;

/* ============================================================
   extractJobDetails — Parse a job posting into structured data
   ============================================================ */

/**
 * Parse a job posting text and return structured data.
 *
 * @param {string} jobText — raw job posting text
 * @returns {{
 *   title: string|null,
 *   company: string|null,
 *   location: string|null,
 *   salary: string|null,
 *   remote: string|null,
 *   requiredSkills: string[],
 *   preferredSkills: string[],
 *   yearsExperience: number|null,
 *   education: string|null,
 *   certifications: string[],
 *   responsibilities: string[],
 *   benefits: string[]
 * }}
 */
export function extractJobDetails(jobText) {
  const text = (jobText || '').trim();
  if (!text) {
    return emptyDetails();
  }

  const lines = text.split(/\n/);

  /* ---- Title (usually the first non-empty short line) ---- */
  let title = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 3 && trimmed.length < 120) {
      title = trimmed;
      break;
    }
  }

  /* ---- Company (look for "at <Company>" or "Company:" near top) ---- */
  let company = null;
  const companyMatch = text.match(/(?:^|\n)\s*(?:company|employer|organization)\s*[:\u2014-]\s*(.+)/im)
    || text.match(/\bat\s+([A-Z][\w\s&.,'-]+?)(?:\s*[-\u2014|]|\n)/);
  if (companyMatch) company = companyMatch[1].trim().slice(0, 80);

  /* ---- Location ---- */
  let location = null;
  const locMatch = text.match(/(?:location|based in|office)\s*[:\u2014-]\s*(.+)/i);
  if (locMatch) location = locMatch[1].trim().split(/[,\n]/)[0].trim().slice(0, 80);

  /* ---- Salary ---- */
  let salary = null;
  const salaryMatch = text.match(SALARY_PATTERN);
  if (salaryMatch) {
    salary = salaryMatch[2]
      ? `$${salaryMatch[1]} - $${salaryMatch[2]}`
      : `$${salaryMatch[1]}`;
  }

  /* ---- Remote / Hybrid / On-site ---- */
  let remote = null;
  const remoteMatch = text.match(REMOTE_PATTERN);
  if (remoteMatch) remote = remoteMatch[1].trim();

  /* ---- Years of experience ---- */
  let yearsExperience = null;
  const expMatch = text.match(EXPERIENCE_PATTERN);
  if (expMatch) yearsExperience = parseInt(expMatch[1], 10);

  /* ---- Education ---- */
  let education = null;
  const eduMatch = text.match(EDUCATION_PATTERN);
  if (eduMatch) education = eduMatch[0].trim();

  /* ---- Sections: split text by known headers ---- */
  const sections = splitSections(text);

  /* ---- Skills via ATS patterns on each section ---- */
  const reqSection = sections.requirements || '';
  const prefSection = sections.preferred || '';

  const requiredSkills = uniqueSkillsFromText(reqSection || text);
  const preferredSkills = uniqueSkillsFromText(prefSection);

  /* ---- Certifications ---- */
  const certMatches = text.match(ATS_PATTERNS.certifications) || [];
  const certifications = [...new Set(certMatches.map(c => c.trim()))];

  /* ---- Responsibilities (bullet points from section) ---- */
  const responsibilities = extractBulletPoints(sections.responsibilities || '');

  /* ---- Benefits ---- */
  const benefits = extractBulletPoints(sections.benefits || '');

  return {
    title,
    company,
    location,
    salary,
    remote,
    requiredSkills,
    preferredSkills,
    yearsExperience,
    education,
    certifications,
    responsibilities,
    benefits,
  };
}

/* ============================================================
   compareJobs — Side-by-side comparison of 2-3 jobs
   ============================================================ */

/**
 * Compare 2-3 job objects against a resume.
 *
 * @param {Array<{title:string, company:string, description:string, salary?:string|number}>} jobs
 * @param {string} resumeText
 * @returns {{
 *   jobs: Array<{title,company,atsScore,salary,skills:{matched:string[],missing:string[]},pros:string[],cons:string[]}>,
 *   skillDemand: {[skill:string]: number},
 *   recommendation: string
 * }}
 */
export function compareJobs(jobs, resumeText) {
  if (!jobs || jobs.length === 0) {
    return { jobs: [], skillDemand: {}, recommendation: 'No jobs to compare.' };
  }

  const comparedJobs = [];
  const skillDemand = {};

  for (const job of jobs) {
    const jd = job.description || job.jd || '';
    const atsResult = resumeText
      ? scoreATSAlignment(resumeText, jd)
      : { score: 0, matched: [], missing: [] };

    const matchedSkills = (atsResult.matched || []).map(m => m.keyword);
    const missingSkills = (atsResult.missing || []).slice(0, 10).map(m => m.keyword);

    // Count skill demand across jobs
    const allJobKeywords = extractATSKeywords(jd);
    for (const category of Object.values(allJobKeywords)) {
      for (const { keyword } of category) {
        skillDemand[keyword] = (skillDemand[keyword] || 0) + 1;
      }
    }

    // Build pros / cons
    const pros = [];
    const cons = [];

    if (atsResult.score >= 70) pros.push('Strong ATS alignment with your resume');
    else if (atsResult.score >= 50) pros.push('Moderate ATS alignment');
    else cons.push('Low ATS alignment — significant skill gaps');

    if (matchedSkills.length >= 8) pros.push(`${matchedSkills.length} skills matched`);
    if (missingSkills.length >= 5) cons.push(`${missingSkills.length} key skills missing`);

    const salary = parseSalaryValue(job.salary);
    if (salary && salary >= 100000) pros.push('Competitive salary range');

    const details = extractJobDetails(jd);
    if (details.remote && /remote/i.test(details.remote)) pros.push('Remote-friendly');
    if (details.yearsExperience && details.yearsExperience > 8) cons.push(`Requires ${details.yearsExperience}+ years experience`);
    if (details.benefits.length >= 3) pros.push('Comprehensive benefits listed');

    comparedJobs.push({
      title: job.title || details.title || 'Untitled',
      company: job.company || details.company || 'Unknown',
      atsScore: atsResult.score,
      salary: job.salary || details.salary || null,
      skills: { matched: matchedSkills, missing: missingSkills },
      pros,
      cons,
    });
  }

  // Determine recommendation
  const sorted = [...comparedJobs].sort((a, b) => b.atsScore - a.atsScore);
  let recommendation;
  if (sorted.length >= 2 && sorted[0].atsScore - sorted[1].atsScore < 5) {
    recommendation = `${sorted[0].title} at ${sorted[0].company} and ${sorted[1].title} at ${sorted[1].company} are closely matched. Focus on the one whose missing skills you can learn fastest.`;
  } else {
    recommendation = `${sorted[0].title} at ${sorted[0].company} is the strongest fit with an ATS score of ${sorted[0].atsScore}%.`;
  }

  return {
    jobs: comparedJobs,
    skillDemand,
    recommendation,
  };
}

/* ============================================================
   getSkillDemandHeatmap — Skill frequency across search results
   ============================================================ */

/**
 * Count skill frequency across all job descriptions in search results.
 *
 * @param {Array<{description?:string, snippet?:string}>} searchResults
 * @returns {Array<{skill:string, count:number, percentage:number}>}
 */
export function getSkillDemandHeatmap(searchResults) {
  if (!searchResults || searchResults.length === 0) return [];

  const skillCounts = {};
  const total = searchResults.length;

  for (const result of searchResults) {
    const text = result.description || result.snippet || '';
    if (!text) continue;

    // Use a Set per result to count unique appearances per posting
    const seenInThisResult = new Set();
    for (const [, pattern] of Object.entries(ATS_PATTERNS)) {
      const matches = text.match(pattern) || [];
      for (const m of matches) {
        const normalized = m.toLowerCase().trim();
        if (!seenInThisResult.has(normalized)) {
          seenInThisResult.add(normalized);
          skillCounts[normalized] = (skillCounts[normalized] || 0) + 1;
        }
      }
    }
  }

  // Build sorted array
  const heatmap = Object.entries(skillCounts)
    .map(([skill, count]) => ({
      skill,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return heatmap;
}

/* ============================================================
   renderJobComparison — Side-by-side comparison UI
   ============================================================ */

/**
 * Render a side-by-side job comparison view into a container.
 *
 * @param {HTMLElement} container — DOM element to render into
 * @param {Array} jobs — job objects (must have title, company, and description/jd)
 * @param {string} resumeText — user's resume text
 */
export function renderJobComparison(container, jobs, resumeText) {
  if (!container) return;
  if (!jobs || jobs.length < 2) {
    container.innerHTML = '<p class="muted">Select at least 2 jobs to compare.</p>';
    return;
  }

  const comparison = compareJobs(jobs, resumeText);

  const colWidth = Math.floor(100 / comparison.jobs.length);

  container.innerHTML = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      ${comparison.jobs.map(j => `
        <div class="panel" style="flex:1;min-width:220px;">
          <h4 style="margin:0 0 4px;">${escapeHtml(j.title)}</h4>
          <div class="muted" style="margin-bottom:8px;">${escapeHtml(j.company)}</div>

          <!-- ATS Score -->
          <div style="text-align:center;margin-bottom:12px;">
            <div style="font-size:36px;font-weight:700;color:${atsScoreColor(j.atsScore)};">${j.atsScore}%</div>
            <div class="muted" style="font-size:12px;">ATS Score</div>
            <div style="height:8px;background:var(--color-surface-border);border-radius:999px;overflow:hidden;margin-top:4px;">
              <div style="height:100%;width:${j.atsScore}%;background:${atsScoreColor(j.atsScore)};border-radius:999px;"></div>
            </div>
          </div>

          <!-- Salary -->
          ${j.salary ? `<div style="margin-bottom:8px;"><strong>Salary:</strong> ${escapeHtml(String(j.salary))}</div>` : ''}

          <!-- Matched Skills -->
          <div style="margin-bottom:8px;">
            <div style="font-size:12px;font-weight:600;margin-bottom:4px;color:var(--color-success);">Matched Skills (${j.skills.matched.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
              ${j.skills.matched.slice(0, 8).map(s => `<span class="chip" style="background:var(--color-success-bg);color:var(--color-success);font-size:11px;">${escapeHtml(s)}</span>`).join('')}
              ${j.skills.matched.length > 8 ? `<span class="chip muted" style="font-size:11px;">+${j.skills.matched.length - 8}</span>` : ''}
            </div>
          </div>

          <!-- Missing Skills -->
          <div style="margin-bottom:12px;">
            <div style="font-size:12px;font-weight:600;margin-bottom:4px;color:var(--color-error);">Missing Skills (${j.skills.missing.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
              ${j.skills.missing.slice(0, 8).map(s => `<span class="chip" style="background:var(--color-error-bg);color:var(--color-error);font-size:11px;">${escapeHtml(s)}</span>`).join('')}
              ${j.skills.missing.length > 8 ? `<span class="chip muted" style="font-size:11px;">+${j.skills.missing.length - 8}</span>` : ''}
            </div>
          </div>

          <!-- Pros -->
          ${j.pros.length > 0 ? `
            <div style="margin-bottom:8px;">
              <div style="font-size:12px;font-weight:600;margin-bottom:4px;">Pros</div>
              <ul style="margin:0;padding-left:16px;font-size:13px;">
                ${j.pros.map(p => `<li style="color:var(--color-success);">${escapeHtml(p)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <!-- Cons -->
          ${j.cons.length > 0 ? `
            <div>
              <div style="font-size:12px;font-weight:600;margin-bottom:4px;">Cons</div>
              <ul style="margin:0;padding-left:16px;font-size:13px;">
                ${j.cons.map(c => `<li style="color:var(--color-error);">${escapeHtml(c)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>

    <!-- Skill Demand Across Compared Jobs -->
    ${Object.keys(comparison.skillDemand).length > 0 ? `
      <div class="panel" style="margin-bottom:12px;">
        <h4 style="margin:0 0 8px;">Skill Demand Across Jobs</h4>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${Object.entries(comparison.skillDemand)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([skill, count]) => `
              <span class="chip" style="font-size:12px;">
                ${escapeHtml(skill)} <strong style="margin-left:4px;">${count}</strong>
              </span>
            `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Recommendation -->
    <div class="panel" style="border-left:3px solid var(--color-primary);padding-left:16px;">
      <h4 style="margin:0 0 4px;">Recommendation</h4>
      <p style="margin:0;font-size:14px;">${escapeHtml(comparison.recommendation)}</p>
    </div>
  `;
}

/* ============================================================
   renderSkillHeatmap — Horizontal bar chart of in-demand skills
   ============================================================ */

/**
 * Render a horizontal bar chart of skill demand from search results.
 *
 * @param {HTMLElement} container — DOM element to render into
 * @param {Array} searchResults — search result objects with descriptions
 */
export function renderSkillHeatmap(container, searchResults) {
  if (!container) return;

  const heatmap = getSkillDemandHeatmap(searchResults);

  if (heatmap.length === 0) {
    container.innerHTML = '<p class="muted">No skill data available. Run a search first.</p>';
    return;
  }

  const top = heatmap.slice(0, 25);
  const maxCount = top[0].count;

  container.innerHTML = `
    <div class="panel">
      <h3 style="margin:0 0 4px;">Skill Demand Heatmap</h3>
      <p class="muted" style="margin-bottom:16px;font-size:13px;">
        Skills most frequently mentioned across ${searchResults.length} job postings
      </p>

      <div style="display:flex;flex-direction:column;gap:6px;">
        ${top.map(item => {
          const barWidth = Math.max(4, Math.round((item.count / maxCount) * 100));
          const hue = heatmapHue(item.percentage);
          return `
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:120px;text-align:right;font-size:13px;font-weight:500;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${escapeHtml(item.skill)}
              </div>
              <div style="flex:1;height:22px;background:var(--color-surface-border);border-radius:var(--radius-sm);overflow:hidden;position:relative;">
                <div style="height:100%;width:${barWidth}%;background:hsl(${hue}, 70%, 50%);border-radius:var(--radius-sm);transition:width 0.4s;"></div>
              </div>
              <div style="width:70px;font-size:12px;color:var(--color-text-muted);flex-shrink:0;">
                ${item.count} (${item.percentage}%)
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/* ============================================================
   Internal helpers
   ============================================================ */

function emptyDetails() {
  return {
    title: null,
    company: null,
    location: null,
    salary: null,
    remote: null,
    requiredSkills: [],
    preferredSkills: [],
    yearsExperience: null,
    education: null,
    certifications: [],
    responsibilities: [],
    benefits: [],
  };
}

/**
 * Split job text into named sections using header patterns.
 */
function splitSections(text) {
  const sections = {};
  const linesArr = text.split(/\n/);
  let currentSection = null;
  let buffer = [];

  for (const line of linesArr) {
    let matched = false;
    for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(line)) {
        // Save previous section
        if (currentSection) {
          sections[currentSection] = buffer.join('\n');
        }
        currentSection = name;
        buffer = [];
        matched = true;
        break;
      }
    }
    if (!matched && currentSection) {
      buffer.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    sections[currentSection] = buffer.join('\n');
  }

  return sections;
}

/**
 * Extract unique hard skills from a text section.
 */
function uniqueSkillsFromText(text) {
  if (!text) return [];
  const matches = text.match(ATS_PATTERNS.hardSkills) || [];
  return [...new Set(matches.map(s => s.toLowerCase().trim()))];
}

/**
 * Extract bullet points from a section of text.
 */
function extractBulletPoints(text) {
  if (!text) return [];
  return text
    .split(/\n/)
    .map(line => line.replace(/^[\s\u2022\u2023\u25E6\u25AA*\-\u2013\u2014]+/, '').trim())
    .filter(line => line.length > 10 && line.length < 500)
    .slice(0, 15);
}

/**
 * Parse a salary value to a number for comparison.
 */
function parseSalaryValue(salary) {
  if (!salary) return null;
  if (typeof salary === 'number') return salary;
  const match = String(salary).match(/([\d,]+)/);
  if (match) return parseInt(match[1].replace(/,/g, ''), 10);
  return null;
}

/**
 * Return a CSS color for an ATS score.
 */
function atsScoreColor(score) {
  if (score >= 70) return 'var(--color-success, #22c55e)';
  if (score >= 45) return 'var(--color-warning, #f59e0b)';
  return 'var(--color-error, #ef4444)';
}

/**
 * Return a hue value for the heatmap gradient (green=high, red=low).
 */
function heatmapHue(percentage) {
  // 0% -> 0 (red), 100% -> 120 (green)
  return Math.round((percentage / 100) * 120);
}

export default {
  extractJobDetails,
  compareJobs,
  getSkillDemandHeatmap,
  renderJobComparison,
  renderSkillHeatmap,
};
