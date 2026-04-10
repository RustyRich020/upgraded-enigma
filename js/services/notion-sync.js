/* ============================================================
   services/notion-sync.js — Notion Sync Service
   ============================================================ */

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/**
 * Status mapping: Notion -> App
 */
const STATUS_FROM_NOTION = {
  'Not started': 'Saved',
  'In progress': 'Applied',
  'Done': 'Offer'
};

/**
 * Status mapping: App -> Notion
 */
const STATUS_TO_NOTION = {
  Saved: 'Not started',
  Applied: 'In progress',
  Interview: 'In progress',
  Offer: 'Done',
  Closed: 'Done'
};

/**
 * Build common fetch headers for Notion API.
 */
function headers(apiToken) {
  return {
    'Authorization': `Bearer ${apiToken}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json'
  };
}

/**
 * Extract a plain-text string from a Notion rich_text array.
 */
function richTextToString(richTextArray) {
  if (!Array.isArray(richTextArray)) return '';
  return richTextArray.map(t => t.plain_text || '').join('');
}

/**
 * Import jobs from a Notion database.
 * @param {string} apiToken — Notion integration token
 * @param {string} databaseId — Notion database ID
 * @returns {Promise<{success: boolean, records: Array, errors: Array}>}
 */
export async function importFromNotion(apiToken, databaseId) {
  const errors = [];
  const records = [];

  try {
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const body = {};
      if (startCursor) body.start_cursor = startCursor;

      const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
        method: 'POST',
        headers: headers(apiToken),
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        errors.push(`Notion API error ${res.status}: ${err.message || res.statusText}`);
        return { success: false, records: [], errors };
      }

      const data = await res.json();
      const pages = data.results || [];

      for (const page of pages) {
        try {
          const props = page.properties || {};
          const job = {
            _notionPageId: page.id,
            title: extractTitle(props),
            company: extractText(props, 'Company') || extractText(props, 'company'),
            status: mapStatusFromNotion(extractStatus(props)),
            url: extractUrl(props),
            location: extractText(props, 'Location') || extractText(props, 'location'),
            _added: page.created_time ? new Date(page.created_time).toISOString().slice(0, 10) : ''
          };
          records.push(job);
        } catch (e) {
          errors.push(`Failed to parse page ${page.id}: ${e.message}`);
        }
      }

      hasMore = data.has_more === true;
      startCursor = data.next_cursor || undefined;
    }

    return { success: true, records, errors };
  } catch (e) {
    errors.push(`Network error: ${e.message}`);
    return { success: false, records: [], errors };
  }
}

/**
 * Export jobs to a Notion database by creating new pages.
 * @param {string} apiToken — Notion integration token
 * @param {string} databaseId — Notion database ID
 * @param {Array} jobs — Array of job objects to export
 * @returns {Promise<{success: boolean, records: Array, errors: Array}>}
 */
export async function exportToNotion(apiToken, databaseId, jobs) {
  const errors = [];
  const records = [];

  for (const job of jobs) {
    try {
      const properties = {
        Name: {
          title: [{ text: { content: job.title || 'Untitled' } }]
        }
      };

      if (job.company) {
        properties['Company'] = {
          rich_text: [{ text: { content: job.company } }]
        };
      }

      if (job.status) {
        properties['Status'] = {
          status: { name: STATUS_TO_NOTION[job.status] || 'Not started' }
        };
      }

      if (job.url) {
        properties['URL'] = { url: job.url };
      }

      if (job.location) {
        properties['Location'] = {
          rich_text: [{ text: { content: job.location } }]
        };
      }

      const res = await fetch(`${NOTION_API}/pages`, {
        method: 'POST',
        headers: headers(apiToken),
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        errors.push(`Failed to create page for "${job.title}": ${err.message || res.statusText}`);
        continue;
      }

      const created = await res.json();
      records.push({ jobId: job.id, notionPageId: created.id });
    } catch (e) {
      errors.push(`Error exporting "${job.title || 'Untitled'}": ${e.message}`);
    }
  }

  return {
    success: errors.length === 0,
    records,
    errors
  };
}

/**
 * Sync job statuses to existing Notion pages.
 * @param {string} apiToken — Notion integration token
 * @param {string} databaseId — Notion database ID (unused but kept for consistency)
 * @param {Array} jobs — Array of job objects with _notionPageId
 * @returns {Promise<{success: boolean, records: Array, errors: Array}>}
 */
export async function syncStatus(apiToken, databaseId, jobs) {
  const errors = [];
  const records = [];

  const jobsWithPageId = jobs.filter(j => j._notionPageId);

  for (const job of jobsWithPageId) {
    try {
      const notionStatus = STATUS_TO_NOTION[job.status] || 'Not started';

      const res = await fetch(`${NOTION_API}/pages/${job._notionPageId}`, {
        method: 'PATCH',
        headers: headers(apiToken),
        body: JSON.stringify({
          properties: {
            Status: {
              status: { name: notionStatus }
            }
          }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        errors.push(`Failed to update "${job.title}": ${err.message || res.statusText}`);
        continue;
      }

      records.push({ jobId: job.id, notionPageId: job._notionPageId, status: notionStatus });
    } catch (e) {
      errors.push(`Error syncing "${job.title || 'Untitled'}": ${e.message}`);
    }
  }

  return {
    success: errors.length === 0,
    records,
    errors
  };
}

/* --- Internal helpers --- */

function extractTitle(props) {
  for (const key of Object.keys(props)) {
    const prop = props[key];
    if (prop.type === 'title') {
      return richTextToString(prop.title);
    }
  }
  return 'Untitled';
}

function extractText(props, fieldName) {
  const prop = props[fieldName];
  if (!prop) return '';
  if (prop.type === 'rich_text') return richTextToString(prop.rich_text);
  if (prop.type === 'title') return richTextToString(prop.title);
  if (prop.type === 'select' && prop.select) return prop.select.name || '';
  return '';
}

function extractStatus(props) {
  /* Try Status field first, then status */
  for (const key of ['Status', 'status']) {
    const prop = props[key];
    if (!prop) continue;
    if (prop.type === 'status' && prop.status) return prop.status.name || '';
    if (prop.type === 'select' && prop.select) return prop.select.name || '';
  }
  return '';
}

function extractUrl(props) {
  for (const key of ['URL', 'url', 'Link', 'link']) {
    const prop = props[key];
    if (!prop) continue;
    if (prop.type === 'url') return prop.url || '';
  }
  return '';
}

function mapStatusFromNotion(notionStatus) {
  if (!notionStatus) return 'Saved';
  return STATUS_FROM_NOTION[notionStatus] || 'Saved';
}

export default { importFromNotion, exportToNotion, syncStatus };
