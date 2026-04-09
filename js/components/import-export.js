/* ============================================================
   components/import-export.js — CSV export/import via PapaParse
   ============================================================ */

/**
 * Export jobs array to a CSV string and trigger download.
 * @param {Array} jobs — array of job objects
 * @returns {string} CSV content
 */
export function exportJobsCsv(jobs) {
  const cols = ['id', 'title', 'company', 'status', 'follow', 'salary', 'source', 'url'];
  const header = cols.join(',');
  const rows = (jobs || []).map(j =>
    cols.map(c => `"${(j[c] ?? '').toString().replace(/"/g, '""')}"`).join(',')
  );
  return [header, ...rows].join('\n');
}

/**
 * Import a CSV file and return parsed data array.
 * @param {File} file — the CSV file to parse
 * @param {string} type — 'jobs' or 'companies'
 * @returns {Promise<Array>} parsed and normalized records
 */
export function importCsv(file, type) {
  const Papa = window.Papa;
  if (!Papa) throw new Error('PapaParse not loaded');

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const data = results.data || [];
        const records = [];
        const errors = [];

        data.forEach((row, i) => {
          try {
            if (type === 'jobs') {
              const title = (row.title || '').trim();
              const company = (row.company || '').trim();
              if (!title || !company) {
                errors.push({ row: i + 1, message: 'missing title or company' });
                return;
              }
              records.push({
                title,
                company,
                status: row.status || 'Saved',
                follow: row.follow || '',
                salary: row.salary || '',
                source: row.source || 'CSV Import',
                url: row.url || ''
              });
            } else if (type === 'companies') {
              const name = (row.name || '').trim();
              if (!name) {
                errors.push({ row: i + 1, message: 'missing name' });
                return;
              }
              records.push({
                name,
                domain: row.domain || '',
                notes: row.notes || ''
              });
            }
          } catch (e) {
            errors.push({ row: i + 1, message: e.message });
          }
        });

        resolve({ records, errors, total: data.length });
      },
      error(err) {
        reject(new Error('CSV parse error: ' + err.message));
      }
    });
  });
}

export default { exportJobsCsv, importCsv };
