/* ============================================================
   services/company-enrichment.js — Abstract Company Enrichment API
   Free: 100 requests/month. Company data by domain.
   Docs: https://www.abstractapi.com/api/company-enrichment
   ============================================================ */

import { ENDPOINTS } from '../config.js';

/**
 * Enrich company data by domain name.
 * @param {string} domain — company domain (e.g., "google.com")
 * @param {string} apiKey — Abstract API key
 * @returns {object} { name, domain, industry, employees, country, city, description, logo }
 */
export async function enrichCompany(domain, apiKey) {
  if (!apiKey) throw new Error('Abstract API requires an API key');
  const url = `${ENDPOINTS.abstractCompany}?api_key=${apiKey}&domain=${encodeURIComponent(domain)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Abstract API returned ' + resp.status);
  const data = await resp.json();

  return {
    name: data.name || '',
    domain: data.domain || domain,
    industry: data.industry || '',
    employees: data.employees_count || data.linkedin_url ? 'See LinkedIn' : '',
    country: data.country || '',
    city: data.city || '',
    description: data.description || '',
    logo: data.logo_url || `https://logo.clearbit.com/${domain}`,
    linkedin: data.linkedin_url || '',
    founded: data.year_founded || ''
  };
}

export default { enrichCompany };
