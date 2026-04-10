/* ============================================================
   services/gmail-tracker.js — Gmail application auto-tracking
   Scans Gmail for job application confirmation emails and
   auto-creates job entries in the tracker.
   Uses the Gmail MCP tools if available, or Gmail API directly.
   ============================================================ */

import { uid, today } from '../utils.js';
import { toast } from '../components/toast.js';

// Common application confirmation patterns
const APP_PATTERNS = [
  { from: /noreply@linkedin\.com/i, subject: /application.*received|applied.*successfully/i, source: 'LinkedIn' },
  { from: /no-reply@indeed\.com/i, subject: /application.*submitted|applied to/i, source: 'Indeed' },
  { from: /noreply@glassdoor\.com/i, subject: /application.*received/i, source: 'Glassdoor' },
  { from: /@greenhouse\.io/i, subject: /application.*received|thank.*applying/i, source: 'Greenhouse' },
  { from: /@lever\.co/i, subject: /application.*received|thank.*applying/i, source: 'Lever' },
  { from: /@workday\.com/i, subject: /application.*submitted/i, source: 'Workday' },
  { from: /@icims\.com/i, subject: /application.*received/i, source: 'iCIMS' },
  { from: /@smartrecruiters\.com/i, subject: /application.*confirmation/i, source: 'SmartRecruiters' },
  { from: /@jobvite\.com/i, subject: /application.*received/i, source: 'Jobvite' },
  { from: /@ashbyhq\.com/i, subject: /application.*received/i, source: 'Ashby' },
];

// Extraction patterns for job title and company from email body/subject
const TITLE_PATTERNS = [
  /(?:applied (?:for|to) (?:the )?(?:position (?:of )?)?)"?([^"]+?)"?\s+(?:at|@)\s+(.+?)(?:\.|,|$)/i,
  /(?:application for )"?([^"]+?)"?\s+(?:at|@)\s+(.+?)(?:\.|,|$)/i,
  /(?:role|position|job):\s*(.+?)(?:\s+at\s+|\s*[-–—]\s*)(.+?)(?:\.|,|$)/i,
  /thank.*applying.*?(?:for )?(?:the )?(?:role (?:of )?)?(.+?)\s+(?:at|@|with)\s+(.+?)(?:\.|,|$)/i,
];

/**
 * Scan Gmail for recent application confirmation emails.
 * Returns parsed job entries ready to be added to the tracker.
 * @param {Function} gmailSearchFn — Gmail search function (from MCP or API)
 * @param {number} daysBack — how many days to look back (default 7)
 * @returns {Array<{title, company, source, date, emailSubject, emailFrom}>}
 */
export async function scanGmailForApplications(gmailSearchFn, daysBack = 7) {
  if (!gmailSearchFn) {
    console.warn('Gmail search function not available');
    return [];
  }

  const results = [];

  // Search for application confirmation emails
  const query = 'subject:(application received OR applied successfully OR application submitted OR thank applying) newer_than:' + daysBack + 'd';

  try {
    const messages = await gmailSearchFn(query);
    if (!messages || !Array.isArray(messages)) return [];

    for (const msg of messages) {
      const parsed = parseApplicationEmail(msg);
      if (parsed) results.push(parsed);
    }
  } catch (err) {
    console.warn('Gmail scan failed:', err);
  }

  return results;
}

/**
 * Parse a single email message into a job application entry.
 * @param {object} message — email with {from, subject, body, date}
 * @returns {object|null} — parsed job or null if not an application email
 */
export function parseApplicationEmail(message) {
  const { from = '', subject = '', body = '', date = '' } = message;

  // Check if this matches any known application confirmation pattern
  let matchedSource = null;
  for (const pattern of APP_PATTERNS) {
    if (pattern.from.test(from) && pattern.subject.test(subject)) {
      matchedSource = pattern.source;
      break;
    }
  }

  // Also check generic patterns (any email with "application received/submitted")
  if (!matchedSource) {
    if (/application\s+(received|submitted|confirmation)/i.test(subject)) {
      matchedSource = 'Email';
    }
  }

  if (!matchedSource) return null;

  // Extract job title and company
  const text = `${subject} ${body}`;
  let title = '';
  let company = '';

  for (const pattern of TITLE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      title = (match[1] || '').trim();
      company = (match[2] || '').trim();
      break;
    }
  }

  // Fallback: try to extract company from sender domain
  if (!company) {
    const domainMatch = from.match(/@([a-z0-9-]+)\./i);
    if (domainMatch) {
      company = domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
    }
  }

  // Fallback: use subject line parts
  if (!title) {
    const subjectClean = subject.replace(/^(re|fwd|fw):\s*/i, '').replace(/application\s+(received|submitted|confirmation)\s*[-–:]/i, '').trim();
    title = subjectClean.slice(0, 80) || 'Application Submitted';
  }

  return {
    id: uid(),
    title: title.slice(0, 100),
    company: company.slice(0, 100),
    status: 'Applied',
    source: matchedSource,
    date: date ? new Date(date).toISOString().slice(0, 10) : today(),
    _added: today(),
    follow: today(7),
    _autoTracked: true,
    _emailSubject: subject.slice(0, 200),
    _emailFrom: from.slice(0, 100),
  };
}

/**
 * Deduplicate Gmail-found applications against existing tracked jobs.
 * @param {Array} gmailJobs — parsed jobs from Gmail
 * @param {Array} existingJobs — current jobs in tracker
 * @returns {Array} — only new, non-duplicate jobs
 */
export function deduplicateGmailJobs(gmailJobs, existingJobs) {
  const existingSet = new Set();
  for (const j of existingJobs) {
    existingSet.add(`${(j.title || '').toLowerCase().trim()}|${(j.company || '').toLowerCase().trim()}`);
  }

  return gmailJobs.filter(j => {
    const key = `${(j.title || '').toLowerCase().trim()}|${(j.company || '').toLowerCase().trim()}`;
    if (existingSet.has(key)) return false;
    existingSet.add(key); // Prevent duplicates within Gmail results too
    return true;
  });
}

/**
 * Full Gmail scan + dedup + add to tracker workflow.
 * @param {Function} gmailSearchFn — Gmail search function
 * @param {object} state — state store
 * @param {Function} addJobFn — function to add a job to tracker
 * @returns {object} — { scanned, found, added }
 */
export async function autoTrackFromGmail(gmailSearchFn, state, addJobFn) {
  const gmailJobs = await scanGmailForApplications(gmailSearchFn);
  if (gmailJobs.length === 0) {
    return { scanned: true, found: 0, added: 0 };
  }

  const existingJobs = (state.get('jobs') || []).filter(j => j.id && j.id !== '_meta');
  const newJobs = deduplicateGmailJobs(gmailJobs, existingJobs);

  for (const job of newJobs) {
    addJobFn(job);
  }

  if (newJobs.length > 0) {
    toast(`Auto-tracked ${newJobs.length} application${newJobs.length > 1 ? 's' : ''} from Gmail`, 'success');
  }

  return { scanned: true, found: gmailJobs.length, added: newJobs.length };
}

export default {
  scanGmailForApplications, parseApplicationEmail,
  deduplicateGmailJobs, autoTrackFromGmail, APP_PATTERNS,
};
