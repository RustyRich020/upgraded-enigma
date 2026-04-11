/* ============================================================
   services/career-ops-lite.js — Lightweight job-search helpers
   inspired by structured Career Ops workflows.
   ============================================================ */

import { SKILL_PATTERNS } from '../config.js';
import { tokenize } from '../utils.js';
import { extractResumeProfile } from './relevance-scorer.js';

const SENIORITY_KEYWORDS = [
  { level: 5, terms: ['principal', 'staff', 'head', 'director', 'vp', 'chief'] },
  { level: 4, terms: ['lead', 'senior', 'sr'] },
  { level: 3, terms: ['mid', 'engineer', 'analyst', 'manager', 'developer', 'specialist'] },
  { level: 2, terms: ['associate', 'junior', 'jr'] },
  { level: 1, terms: ['intern', 'trainee', 'graduate'] }
];

const SCORE_WEIGHTS = {
  roleMatch: 0.22,
  skillsAlignment: 0.24,
  seniorityFit: 0.08,
  compensation: 0.12,
  geographicFit: 0.1,
  trajectory: 0.08,
  interviewLikelihood: 0.1,
  timing: 0.06
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function parseSalaryValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value) return 0;
  const matches = String(value).match(/\d[\d,]*/g);
  if (!matches || matches.length === 0) return 0;
  const numbers = matches
    .map(match => Number(match.replace(/,/g, '')))
    .filter(number => Number.isFinite(number) && number > 0);
  if (!numbers.length) return 0;
  return Math.round(average(numbers));
}

function extractSkillMentions(text) {
  const skillSet = new Set();
  if (!text) return [];
  const regex = new RegExp(SKILL_PATTERNS.source, SKILL_PATTERNS.flags);
  let match;
  while ((match = regex.exec(text)) !== null) {
    skillSet.add(match[1].toLowerCase().trim());
  }
  return Array.from(skillSet);
}

function detectSeniorityLevel(text) {
  const haystack = String(text || '').toLowerCase();
  for (const entry of SENIORITY_KEYWORDS) {
    if (entry.terms.some(term => haystack.includes(term))) {
      return entry.level;
    }
  }
  return 0;
}

function deriveProfileLevel({ resumes = [], jobs = [] }) {
  const levels = [];
  resumes.forEach(resume => {
    if (resume?.name) levels.push(detectSeniorityLevel(resume.name));
  });
  jobs.forEach(job => {
    if (job?.title) levels.push(detectSeniorityLevel(job.title));
  });
  const filtered = levels.filter(Boolean);
  return filtered.length ? Math.round(average(filtered)) : 0;
}

function deriveRemotePreference(settings = {}) {
  const location = String(settings.searchLocation || settings.locationPreference || '').toLowerCase();
  const remotePreference = String(settings.remotePreference || '').toLowerCase();
  if (remotePreference.includes('remote') || location.includes('remote')) return 'remote';
  if (remotePreference.includes('hybrid')) return 'hybrid';
  if (remotePreference.includes('onsite') || remotePreference.includes('on-site')) return 'onsite';
  return 'flexible';
}

function inferTrajectoryScore(text) {
  const haystack = String(text || '').toLowerCase();
  const positiveSignals = [
    'ownership', 'roadmap', 'strategy', 'growth', 'mentor', 'lead', 'impact',
    'platform', 'scalable', 'customer', 'product', 'cross-functional', 'career'
  ];
  const matched = positiveSignals.filter(signal => haystack.includes(signal)).length;
  if (!haystack) return 55;
  if (matched >= 5) return 88;
  if (matched >= 3) return 74;
  if (matched >= 1) return 64;
  return 52;
}

function inferTimingScore(job) {
  if (!job?.date) return 55;
  const jobDate = new Date(job.date);
  if (Number.isNaN(jobDate.getTime())) return 55;
  const now = new Date();
  const daysDiff = Math.floor((now - jobDate) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 3) return 95;
  if (daysDiff <= 7) return 88;
  if (daysDiff <= 14) return 74;
  if (daysDiff <= 30) return 58;
  return 40;
}

export function gradeForFitScore(score) {
  if (score >= 88) return 'A';
  if (score >= 78) return 'B';
  if (score >= 68) return 'C';
  if (score >= 58) return 'D';
  if (score >= 48) return 'E';
  return 'F';
}

export function buildCareerProfile({ resumes = [], jobs = [], offers = [], settings = {} } = {}) {
  const resumeProfile = extractResumeProfile(resumes);
  const targetSalaryCandidates = [
    settings.targetSalary,
    ...offers.map(offer => offer?.baseSalary),
    ...jobs.map(job => parseSalaryValue(job?.salary))
  ].map(Number).filter(value => Number.isFinite(value) && value > 0);

  return {
    ...resumeProfile,
    targetSalary: targetSalaryCandidates.length ? Math.round(average(targetSalaryCandidates)) : 0,
    remotePreference: deriveRemotePreference(settings),
    seniorityLevel: deriveProfileLevel({ resumes, jobs }),
  };
}

export function evaluateOpportunity(job, profile = {}) {
  const title = String(job?.title || '');
  const description = String(job?.description || job?.jd || '');
  const location = String(job?.location || '');
  const remoteLabel = `${String(job?.remote || '')} ${location}`.toLowerCase();
  const titleTokens = new Set(tokenize(title));
  const textTokens = new Set(tokenize(`${title} ${description}`));
  const profileKeywords = profile.titleKeywords || [];
  const profileSkills = profile.skills || [];
  const mentionedSkills = extractSkillMentions(`${title} ${description}`);
  const matchedSkills = profileSkills.filter(skill => textTokens.has(skill) || description.toLowerCase().includes(skill));
  const missingSkills = mentionedSkills.filter(skill => !profileSkills.includes(skill));

  const roleMatch = profileKeywords.length
    ? clamp((profileKeywords.filter(keyword => titleTokens.has(keyword) || textTokens.has(keyword)).length / profileKeywords.length) * 100)
    : 65;
  const skillsAlignment = profileSkills.length
    ? clamp((matchedSkills.length / profileSkills.length) * 100)
    : 65;

  const jobLevel = detectSeniorityLevel(title);
  const profileLevel = profile.seniorityLevel || 0;
  const seniorityFit = jobLevel && profileLevel
    ? clamp(100 - (Math.abs(jobLevel - profileLevel) * 18), 35, 100)
    : 65;

  const salaryValue = parseSalaryValue(job?.salary);
  let compensation = 55;
  if (salaryValue && profile.targetSalary) {
    const ratio = salaryValue / profile.targetSalary;
    if (ratio >= 1.1) compensation = 95;
    else if (ratio >= 1.0) compensation = 86;
    else if (ratio >= 0.9) compensation = 74;
    else if (ratio >= 0.8) compensation = 60;
    else compensation = 42;
  } else if (salaryValue) {
    compensation = 74;
  }

  let geographicFit = 65;
  if (remoteLabel.includes('remote')) {
    geographicFit = profile.remotePreference === 'onsite' ? 72 : 94;
  } else if (remoteLabel.includes('hybrid')) {
    geographicFit = profile.remotePreference === 'remote' ? 76 : 84;
  } else if (remoteLabel.includes('onsite') || remoteLabel.includes('on-site')) {
    geographicFit = profile.remotePreference === 'remote' ? 38 : 68;
  }

  const trajectory = inferTrajectoryScore(description);
  const timing = inferTimingScore(job);
  const interviewLikelihood = clamp((roleMatch * 0.35) + (skillsAlignment * 0.45) + (timing * 0.2));

  const weightedScore = (
    (roleMatch * SCORE_WEIGHTS.roleMatch) +
    (skillsAlignment * SCORE_WEIGHTS.skillsAlignment) +
    (seniorityFit * SCORE_WEIGHTS.seniorityFit) +
    (compensation * SCORE_WEIGHTS.compensation) +
    (geographicFit * SCORE_WEIGHTS.geographicFit) +
    (trajectory * SCORE_WEIGHTS.trajectory) +
    (interviewLikelihood * SCORE_WEIGHTS.interviewLikelihood) +
    (timing * SCORE_WEIGHTS.timing)
  );

  let score = Math.round(weightedScore);
  if (roleMatch < 35 || skillsAlignment < 35) {
    score = Math.min(score, 54);
  }

  const dimensions = [
    ['Role Match', roleMatch],
    ['Skills Alignment', skillsAlignment],
    ['Seniority Fit', seniorityFit],
    ['Compensation', compensation],
    ['Geographic Fit', geographicFit],
    ['Trajectory', trajectory],
    ['Interview Likelihood', interviewLikelihood],
    ['Timing', timing],
  ].map(([label, value]) => ({ label, score: Math.round(value) }));

  const strengths = dimensions.filter(item => item.score >= 75).map(item => item.label).slice(0, 3);
  const risks = dimensions.filter(item => item.score < 60).map(item => item.label).slice(0, 3);
  const grade = gradeForFitScore(score);

  return {
    score,
    scoreFive: Number((score / 20).toFixed(2)),
    grade,
    matchedSkills,
    missingSkills,
    strengths,
    risks,
    dimensions,
    summary: strengths.length
      ? `${grade} fit driven by ${strengths.join(', ')}`
      : `${grade} fit with the biggest watchouts around ${risks.join(', ') || 'missing context'}`,
  };
}

export function summarizeLearningGaps(jobs, profile, limit = 5) {
  const counts = {};
  (jobs || []).forEach(job => {
    const evaluation = evaluateOpportunity(job, profile);
    evaluation.missingSkills.forEach(skill => {
      counts[skill] = (counts[skill] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([skill, count]) => ({ skill, count }));
}

export function buildInterviewPrep(interview, job, stories = [], profile = {}) {
  const evaluation = evaluateOpportunity(job || interview || {}, profile);
  const jobText = `${job?.title || interview?.role || ''} ${job?.description || job?.jd || ''}`.toLowerCase();

  const storyMatches = (stories || [])
    .map(story => {
      const storySkills = Array.isArray(story.skills)
        ? story.skills.map(skill => String(skill).toLowerCase())
        : tokenize(story.skills || '');
      const overlap = storySkills.filter(skill => jobText.includes(skill)).length;
      return { ...story, overlap };
    })
    .filter(story => story.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3);

  const likelyQuestions = [
    `Why does ${job?.company || interview?.company || 'this role'} make sense for you right now?`,
    `Tell me about a project where you used ${evaluation.matchedSkills[0] || 'your core strengths'} to solve a hard problem.`,
    evaluation.missingSkills[0]
      ? `How are you closing the gap around ${evaluation.missingSkills[0]}?`
      : 'What kind of scope are you ready to own from day one?'
  ];

  return {
    evaluation,
    focusAreas: evaluation.risks.length ? evaluation.risks : ['Role Match', 'Interview Likelihood'],
    storyMatches,
    likelyQuestions,
    talkingPoints: [
      `Lead with ${evaluation.strengths[0] || 'your strongest relevant experience'}.`,
      evaluation.matchedSkills.length
        ? `Use concrete proof points around ${evaluation.matchedSkills.slice(0, 3).join(', ')}.`
        : 'Use concrete proof points that show role alignment quickly.',
      evaluation.missingSkills[0]
        ? `Have an honest learning plan for ${evaluation.missingSkills[0]}.`
        : 'Prepare a concise answer about why you are a strong fit now.'
    ]
  };
}

export function generateOutreachDraft({
  contactName = '',
  company = '',
  role = '',
  askType = 'informational',
  sharedContext = '',
  notes = ''
} = {}) {
  const cleanContact = contactName || 'there';
  const cleanCompany = company || 'your team';
  const cleanRole = role ? ` about the ${role} role` : '';

  const askLine = askType === 'referral'
    ? `If it feels appropriate after a quick look, I would really appreciate any advice on whether I should pursue it or a referral.`
    : askType === 'followup'
      ? `I wanted to follow up briefly and keep the door open if there is a useful next step on your side.`
      : `If you are open to it, I would love a short conversation to understand the team and what strong candidates usually demonstrate.`;

  const sharedLine = sharedContext
    ? `We seem to overlap on ${sharedContext}. `
    : '';
  const noteLine = notes ? `Context: ${notes}` : '';

  return {
    subject: `${company ? `${company}` : 'Career'}${role ? ` - ${role}` : ''} intro`,
    body: `Hi ${cleanContact},\n\n${sharedLine}I came across${cleanRole} at ${cleanCompany} and it looks closely aligned with the kind of work I enjoy most. ${askLine}\n\nI’m especially drawn to the mix of scope, ownership, and problem solving in the role. ${noteLine}\n\nThanks for your time,\n[Your Name]`,
  };
}

export default {
  buildCareerProfile,
  buildInterviewPrep,
  evaluateOpportunity,
  generateOutreachDraft,
  gradeForFitScore,
  parseSalaryValue,
  summarizeLearningGaps
};
