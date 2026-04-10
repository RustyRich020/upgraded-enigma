/* ============================================================
   services/ats-optimizer.js — ATS Keyword Intelligence Engine

   Extracts power keywords from job postings, scores resume
   alignment, identifies gaps, and recommends optimal job titles.
   ============================================================ */

import { callGemini } from './ai-gemini.js';
import { callGroq } from './ai-groq.js';
import { getApi, hasApi } from './api-keys.js';
import { tokenize } from '../utils.js';

// ============================================================
// ATS KEYWORD EXTRACTION — Parse real job postings for keywords
// ============================================================

/**
 * Common ATS keyword categories with weighted importance.
 */
const ATS_CATEGORIES = {
  hardSkills: { weight: 3, label: 'Hard Skills / Tools' },
  softSkills: { weight: 1, label: 'Soft Skills' },
  certifications: { weight: 3, label: 'Certifications' },
  education: { weight: 2, label: 'Education' },
  experience: { weight: 2, label: 'Experience Level' },
  actionVerbs: { weight: 1, label: 'Action Verbs' },
  industryTerms: { weight: 2, label: 'Industry Terms' },
};

/**
 * Extended skill/keyword patterns for ATS scanning.
 * Much more comprehensive than the basic SKILL_PATTERNS.
 */
const ATS_PATTERNS = {
  hardSkills: /\b(python|java|javascript|typescript|c\+\+|c#|ruby|go|rust|swift|kotlin|scala|php|r\b|matlab|sql|nosql|mysql|postgresql|mongodb|oracle|redis|elasticsearch|cassandra|dynamodb|snowflake|databricks|bigquery|redshift|spark|hadoop|kafka|airflow|dbt|tableau|power bi|looker|grafana|splunk|datadog|new relic|prometheus|aws|azure|gcp|cloud|docker|kubernetes|k8s|terraform|ansible|puppet|chef|jenkins|github actions|gitlab ci|circleci|argo|helm|linux|unix|windows server|vmware|networking|tcp\/ip|dns|dhcp|vpn|ssl|tls|firewall|palo alto|check point|fortinet|cisco|juniper|wireshark|nmap|burp suite|metasploit|nessus|qualys|crowdstrike|sentinelone|okta|active directory|ldap|saml|oauth|sso|iam|siem|soar|edr|xdr|dlp|ids|ips|waf|penetration testing|vulnerability assessment|incident response|threat hunting|malware analysis|digital forensics|soc|noc|excel|vba|power query|powershell|bash|shell scripting|git|svn|jira|confluence|servicenow|salesforce|sap|api|rest|graphql|grpc|microservices|ci\/cd|devops|devsecops|sre|agile|scrum|kanban|machine learning|deep learning|nlp|computer vision|tensorflow|pytorch|scikit|pandas|numpy|react|angular|vue|next\.js|node\.js|express|django|flask|spring|\.net|laravel)\b/gi,

  certifications: /\b(ccna|ccnp|ccie|ccsp|cissp|cism|cisa|crisc|ceh|oscp|osce|giac|gsec|gcih|gcia|gpen|comptia\s*(a\+|network\+|security\+|cysa\+|casp\+|pentest\+|cloud\+|linux\+|server\+)|aws\s*(certified|solutions architect|developer|sysops|devops|security specialty|cloud practitioner)|azure\s*(certified|administrator|developer|solutions architect|security engineer)|gcp\s*(certified|professional|associate)|pmp|prince2|itil|cobit|six sigma|togaf|scrum master|csm|psm|safe|cbap|rhce|rhcsa|cka|ckad|cks|hashicorp certified|splunk certified)\b/gi,

  softSkills: /\b(leadership|communication|collaboration|teamwork|problem.solving|critical thinking|analytical|strategic|mentoring|coaching|stakeholder management|cross.functional|presentation|documentation|project management|time management|attention to detail|self.motivated|proactive|adaptable|innovative)\b/gi,

  actionVerbs: /\b(designed|developed|implemented|architected|engineered|automated|optimized|managed|led|coordinated|analyzed|evaluated|assessed|configured|deployed|maintained|monitored|troubleshot|resolved|investigated|documented|streamlined|reduced|improved|increased|delivered|established|built|created|launched|migrated|integrated|secured|hardened|remediated|orchestrated|provisioned|administered)\b/gi,

  experienceLevel: /\b(\d+\+?\s*years?\s*(?:of\s*)?experience|entry.level|junior|mid.level|senior|staff|principal|lead|architect|director|manager|vp|head of)\b/gi,

  industryTerms: /\b(compliance|governance|risk management|audit|sox|pci.dss|hipaa|gdpr|nist|iso 27001|cis|owasp|mitre att&ck|cyber kill chain|zero trust|defense in depth|least privilege|need to know|separation of duties|change management|incident management|business continuity|disaster recovery|sla|kpi|roi|tcf|regulatory|framework|policy|standard|procedure|baseline|benchmark)\b/gi,
};

/**
 * Extract ATS keywords from a job posting text.
 * Returns categorized keywords with frequency counts.
 */
export function extractATSKeywords(jobText) {
  const text = (jobText || '').toLowerCase();
  const results = {};

  for (const [category, pattern] of Object.entries(ATS_PATTERNS)) {
    const matches = text.match(pattern) || [];
    const counts = {};
    matches.forEach(m => {
      const key = m.toLowerCase().trim();
      counts[key] = (counts[key] || 0) + 1;
    });
    // Sort by frequency descending
    results[category] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([keyword, count]) => ({ keyword, count, category }));
  }

  return results;
}

/**
 * Extract keywords from the resume text using the same ATS patterns.
 */
export function extractResumeKeywords(resumeText) {
  return extractATSKeywords(resumeText);
}

// ============================================================
// RESUME-TO-ROLE ALIGNMENT SCORING
// ============================================================

/**
 * Score how well a resume aligns with a specific job posting.
 * Returns a detailed breakdown with an ATS compatibility score.
 *
 * @param {string} resumeText — full resume text
 * @param {string} jobText — full job posting text
 * @returns {object} — { score, breakdown, missing, matched, suggestions }
 */
export function scoreATSAlignment(resumeText, jobText) {
  const jobKeywords = extractATSKeywords(jobText);
  const resumeKeywords = extractATSKeywords(resumeText);

  let totalWeightedPoints = 0;
  let earnedWeightedPoints = 0;
  const matched = [];
  const missing = [];
  const breakdown = {};

  for (const [category, jobKWs] of Object.entries(jobKeywords)) {
    if (jobKWs.length === 0) continue;

    const weight = ATS_CATEGORIES[category]?.weight || 1;
    const resumeKWSet = new Set((resumeKeywords[category] || []).map(k => k.keyword));

    let categoryMatched = 0;
    let categoryTotal = jobKWs.length;

    for (const { keyword, count } of jobKWs) {
      const points = weight * count;
      totalWeightedPoints += points;

      if (resumeKWSet.has(keyword)) {
        earnedWeightedPoints += points;
        categoryMatched++;
        matched.push({ keyword, category, weight, count });
      } else {
        missing.push({ keyword, category, weight, count, priority: weight * count });
      }
    }

    breakdown[category] = {
      label: ATS_CATEGORIES[category]?.label || category,
      matched: categoryMatched,
      total: categoryTotal,
      percentage: categoryTotal > 0 ? Math.round((categoryMatched / categoryTotal) * 100) : 0,
    };
  }

  // Sort missing by priority (highest impact gaps first)
  missing.sort((a, b) => b.priority - a.priority);

  const score = totalWeightedPoints > 0
    ? Math.round((earnedWeightedPoints / totalWeightedPoints) * 100)
    : 0;

  return {
    score,
    breakdown,
    matched: matched.sort((a, b) => b.weight * b.count - a.weight * a.count),
    missing: missing.slice(0, 30), // Top 30 gaps
    totalJobKeywords: Object.values(jobKeywords).reduce((a, arr) => a + arr.length, 0),
    totalResumeKeywords: Object.values(resumeKeywords).reduce((a, arr) => a + arr.length, 0),
  };
}

// ============================================================
// AI-POWERED DEEP ANALYSIS
// ============================================================

/**
 * Use AI to perform deep ATS analysis: keyword gaps, phrasing suggestions,
 * and role alignment recommendations.
 */
export async function deepATSAnalysis(resumeText, jobText) {
  const apiKey = hasApi('geminiKey') ? getApi('geminiKey') : (hasApi('groqKey') ? getApi('groqKey') : null);
  if (!apiKey) {
    return { error: 'No AI API key configured. Add a Gemini or Groq key in Settings.' };
  }

  const prompt = `You are an ATS (Applicant Tracking System) optimization expert. Analyze this resume against this job posting.

RESUME:
${resumeText.slice(0, 3000)}

JOB POSTING:
${jobText.slice(0, 3000)}

Provide a JSON response with this exact structure (no markdown, just JSON):
{
  "atsScore": <number 0-100>,
  "topMatchingKeywords": ["keyword1", "keyword2", ...up to 10],
  "criticalMissingKeywords": ["keyword1", "keyword2", ...up to 10],
  "suggestedPhrases": [
    {"phrase": "exact phrase to add to resume", "where": "which section", "why": "brief reason"},
    ...up to 5
  ],
  "bestFitRoles": [
    {"title": "Job Title", "matchPercent": <number>, "reason": "brief reason"},
    ...up to 5
  ],
  "resumeTips": ["tip1", "tip2", ...up to 5],
  "searchQueries": ["optimized query 1", "query 2", ...up to 4]
}`;

  try {
    const callFn = hasApi('geminiKey') ? callGemini : callGroq;
    const result = await callFn(prompt, apiKey);

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = result;
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    // Try to find JSON object in the response
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }

    return { error: 'Could not parse AI response', raw: result.slice(0, 500) };
  } catch (e) {
    return { error: 'AI analysis failed: ' + e.message };
  }
}

// ============================================================
// ROLE RECOMMENDER — Find best-fit job titles from resume
// ============================================================

/**
 * Analyze a resume and recommend the best job titles to search for.
 * Uses pattern matching + AI if available.
 */
export async function recommendRoles(resumeText) {
  // First: heuristic role detection from keywords
  const keywords = extractATSKeywords(resumeText);
  const allHardSkills = (keywords.hardSkills || []).map(k => k.keyword);
  const allCerts = (keywords.certifications || []).map(k => k.keyword);

  // Role patterns: if resume has these keywords, recommend these titles
  const roleMap = [
    { skills: ['firewall', 'palo alto', 'check point', 'siem', 'incident response'], titles: ['Security Analyst', 'Network Security Analyst', 'SOC Analyst', 'Information Security Analyst', 'Cybersecurity Analyst'] },
    { skills: ['cisco', 'networking', 'tcp/ip', 'vpn', 'dns'], titles: ['Network Engineer', 'Network Administrator', 'Systems Engineer', 'Infrastructure Engineer'] },
    { skills: ['sql', 'tableau', 'power bi', 'excel', 'data analysis'], titles: ['Data Analyst', 'Business Analyst', 'Business Intelligence Analyst', 'Reporting Analyst'] },
    { skills: ['python', 'machine learning', 'tensorflow', 'pytorch'], titles: ['Data Scientist', 'ML Engineer', 'AI Engineer', 'Research Scientist'] },
    { skills: ['aws', 'terraform', 'kubernetes', 'docker', 'ci/cd'], titles: ['DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer', 'Platform Engineer'] },
    { skills: ['react', 'javascript', 'typescript', 'node.js'], titles: ['Frontend Developer', 'Full Stack Developer', 'Software Engineer', 'Web Developer'] },
    { skills: ['compliance', 'governance', 'audit', 'risk management'], titles: ['GRC Analyst', 'Compliance Analyst', 'Risk Analyst', 'IT Auditor', 'Security Compliance Analyst'] },
    { skills: ['powershell', 'ansible', 'automation', 'scripting'], titles: ['Automation Engineer', 'Systems Administrator', 'DevOps Engineer', 'IT Operations Engineer'] },
    { skills: ['project management', 'agile', 'scrum', 'jira'], titles: ['Project Manager', 'Scrum Master', 'Program Manager', 'Technical Project Manager'] },
    { skills: ['penetration testing', 'vulnerability assessment', 'oscp', 'burp suite'], titles: ['Penetration Tester', 'Security Consultant', 'Red Team Analyst', 'Ethical Hacker'] },
  ];

  const scores = {};
  const skillSet = new Set(allHardSkills);

  for (const role of roleMap) {
    const matchCount = role.skills.filter(s => skillSet.has(s)).length;
    if (matchCount > 0) {
      const matchPct = Math.round((matchCount / role.skills.length) * 100);
      for (const title of role.titles) {
        if (!scores[title] || scores[title].score < matchPct) {
          scores[title] = { title, score: matchPct, matchedSkills: role.skills.filter(s => skillSet.has(s)) };
        }
      }
    }
  }

  const ranked = Object.values(scores)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return {
    recommendedRoles: ranked,
    detectedSkills: allHardSkills,
    detectedCerts: allCerts,
    totalKeywords: allHardSkills.length + allCerts.length,
  };
}

// ============================================================
// SMART SEARCH QUERY GENERATOR
// ============================================================

/**
 * Generate optimized job search queries based on ATS keyword analysis.
 * These are designed to find roles where the applicant would score highly.
 */
export function generateSmartQueries(resumeText) {
  const keywords = extractATSKeywords(resumeText);
  const topHardSkills = (keywords.hardSkills || []).slice(0, 6).map(k => k.keyword);
  const topCerts = (keywords.certifications || []).slice(0, 3).map(k => k.keyword);
  const topIndustry = (keywords.industryTerms || []).slice(0, 3).map(k => k.keyword);

  const queries = [];

  // Combine top skills into targeted queries
  if (topHardSkills.length >= 2) {
    queries.push(`${topHardSkills[0]} ${topHardSkills[1]} analyst`);
    queries.push(`${topHardSkills[0]} ${topHardSkills[2] || topHardSkills[1]} engineer`);
  }

  // Certification-based query
  if (topCerts.length > 0) {
    queries.push(`${topCerts[0]} ${topHardSkills[0] || ''} jobs`);
  }

  // Industry-specific query
  if (topIndustry.length > 0 && topHardSkills.length > 0) {
    queries.push(`${topIndustry[0]} ${topHardSkills[0]}`);
  }

  // Senior/lead query if experience keywords found
  if ((keywords.experienceLevel || []).some(k => /senior|lead|principal/i.test(k.keyword))) {
    queries.push(`senior ${topHardSkills[0] || ''} ${topHardSkills[1] || ''}`);
  }

  return queries.filter(q => q.trim().length > 3).slice(0, 5);
}

export default {
  extractATSKeywords, extractResumeKeywords,
  scoreATSAlignment, deepATSAnalysis,
  recommendRoles, generateSmartQueries,
  ATS_CATEGORIES, ATS_PATTERNS,
};
