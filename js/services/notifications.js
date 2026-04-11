/* ============================================================
   services/notifications.js — Notifications (Browser + ntfy.sh)
   Handles permission states, follow-up checks, and push.
   ============================================================ */

import { ENDPOINTS } from '../config.js';
import { today } from '../utils.js';
import { toast } from '../components/toast.js';

/**
 * Request browser notification permission.
 * Handles all permission states including previously denied.
 * @returns {boolean} whether permission is granted
 */
export async function requestPermission() {
  if (!('Notification' in window)) {
    toast('Browser notifications not supported', 'error');
    return false;
  }

  if (Notification.permission === 'granted') {
    toast('Notifications already enabled', 'success');
    return true;
  }

  if (Notification.permission === 'denied') {
    toast('Notifications were blocked. Click the lock icon in your browser address bar → Site Settings → Allow Notifications, then reload.', 'error');
    return false;
  }

  // Permission is 'default' — can request
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      toast('Notifications enabled!', 'success');
      // Send a test notification
      new Notification('JobSync', {
        body: 'Notifications are working! You\'ll get reminders for follow-ups.',
        icon: getNotificationIcon(),
      });
      return true;
    } else {
      toast('Notification permission denied. You can enable it later in browser settings.', 'error');
      return false;
    }
  } catch (e) {
    toast('Could not request notification permission', 'error');
    return false;
  }
}

/**
 * Get the current notification permission status with user-friendly label.
 */
export function getPermissionStatus() {
  if (!('Notification' in window)) return { status: 'unsupported', label: 'Not Supported' };
  const perm = Notification.permission;
  if (perm === 'granted') return { status: 'granted', label: 'Enabled' };
  if (perm === 'denied') return { status: 'denied', label: 'Blocked — reset in browser settings' };
  return { status: 'default', label: 'Not yet enabled' };
}

/**
 * Check for jobs with follow-ups due today or overdue, and send notifications.
 * Always tries ntfy.sh push even if browser notifications are denied.
 */
export function checkFollowUps(jobs, ntfyTopic) {
  const todayStr = today();
  const dueJobs = (jobs || []).filter(j =>
    j.follow && j.follow <= todayStr && j.status !== 'Closed'
  );

  if (dueJobs.length === 0) return [];

  dueJobs.forEach(j => {
    const message = `${j.title} @ ${j.company} — follow-up due ${j.follow}`;

    // Browser notification (if granted)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('JobSync Follow-Up', {
          body: message,
          icon: getNotificationIcon(),
          tag: 'jobsync-followup-' + j.id,
          requireInteraction: false,
        });
      } catch (e) {
        // Service worker may be required in some contexts
      }
    }

    // ntfy.sh push (always try if topic is set — works even if browser notifs denied)
    if (ntfyTopic) {
      sendNtfy(message, ntfyTopic);
    }
  });

  // Also show an in-app toast summary
  if (dueJobs.length > 0) {
    toast(`${dueJobs.length} follow-up${dueJobs.length > 1 ? 's' : ''} due today`, 'info');
  }

  return dueJobs;
}

/**
 * Send a push notification via ntfy.sh.
 */
export async function sendNtfy(message, topic) {
  if (!topic) return false;
  try {
    const resp = await fetch(`${ENDPOINTS.ntfy}/${topic}`, {
      method: 'POST',
      body: message,
      headers: {
        'Title': 'JobSync',
        'Priority': '3',
        'Tags': 'briefcase',
      }
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Set up recurring follow-up checks.
 * Runs immediately, then every 30 minutes.
 */
export function scheduleChecks(getJobs, ntfyTopic) {
  // Initial check after a short delay (let app finish loading)
  setTimeout(() => checkFollowUps(getJobs(), ntfyTopic), 5000);
  // Then every 30 minutes
  return setInterval(() => checkFollowUps(getJobs(), ntfyTopic), 30 * 60 * 1000);
}

/**
 * Get the notification icon as a data URI.
 */
function getNotificationIcon() {
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" rx="12" fill="#1a1a1e"/>' +
    '<path d="M32 12c-3 0-5 2-5 5v8c0 1.6-.8 3-2 4l-2 1.6c-1.6 1-3 3-3 5.4v4h24v-4c0-2.4-1.4-4.4-3-5.4l-2-1.6c-1.2-1-2-2.4-2-4v-8c0-3-2-5-5-5z" fill="#D4874D"/>' +
    '<path d="M20 44h24v6c0 3.4-2.6 6-6 6h-4v8h-4v-8h-4c-3.4 0-6-2.6-6-6v-6z" fill="#D4874D" opacity="0.6"/>' +
    '</svg>'
  );
}

export default { requestPermission, getPermissionStatus, checkFollowUps, sendNtfy, scheduleChecks };
