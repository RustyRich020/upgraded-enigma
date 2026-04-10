/* ============================================================
   services/notifications.js — Browser notifications + ntfy.sh
   ============================================================ */

import { ENDPOINTS } from '../config.js';
import { today } from '../utils.js';

/**
 * Request browser notification permission.
 * @returns {boolean} whether permission was granted
 */
export async function requestPermission() {
  if (!('Notification' in window)) return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

/**
 * Check for jobs with follow-ups due today or overdue, and send notifications.
 * @param {Array} jobs — array of job objects
 * @param {string} ntfyTopic — optional ntfy.sh topic for push notifications
 */
export function checkFollowUps(jobs, ntfyTopic) {
  const todayStr = today();
  const dueJobs = (jobs || []).filter(j =>
    j.follow && j.follow <= todayStr && j.status !== 'Closed'
  );

  dueJobs.forEach(j => {
    // Browser notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('JobSync Follow-Up', {
        body: `${j.title} @ ${j.company} — follow-up due ${j.follow}`,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="30" fill="%23000" stroke="%23f00" stroke-width="3"/><text x="32" y="42" text-anchor="middle" fill="%23f00" font-size="32" font-weight="bold">T</text></svg>',
        tag: 'tron-followup-' + j.id
      });
    }

    // Ntfy.sh push
    if (ntfyTopic) {
      sendNtfy(`Follow-up due: ${j.title} @ ${j.company} (${j.follow})`, ntfyTopic);
    }
  });

  return dueJobs;
}

/**
 * Send a push notification via ntfy.sh.
 * @param {string} message — notification message
 * @param {string} topic — ntfy.sh topic name
 */
export async function sendNtfy(message, topic) {
  if (!topic) return;
  try {
    await fetch(`${ENDPOINTS.ntfy}/${topic}`, {
      method: 'POST',
      body: message,
      headers: {
        'Title': 'JobSync',
        'Priority': '3',
        'Tags': 'briefcase'
      }
    });
  } catch {
    // Silent fail for push notifications
  }
}

/**
 * Set up recurring follow-up checks (every 30 minutes).
 * @param {Function} getJobs — function that returns the current jobs array
 * @param {string} ntfyTopic — optional ntfy.sh topic
 * @returns {number} interval ID
 */
export function scheduleChecks(getJobs, ntfyTopic) {
  const check = () => checkFollowUps(getJobs(), ntfyTopic);
  check(); // initial check
  return setInterval(check, 30 * 60 * 1000);
}

export default { requestPermission, checkFollowUps, sendNtfy, scheduleChecks };
