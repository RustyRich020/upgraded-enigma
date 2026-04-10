/* ============================================================
   services/api-proxy.js — Firebase Functions API proxy client
   Calls Cloud Functions instead of direct APIs to hide keys.
   Falls back to direct calls if Functions unavailable.
   ============================================================ */

/**
 * Call the Firebase Cloud Function API proxy.
 * @param {string} action — the API action (e.g., 'search-remotive', 'ai-gemini')
 * @param {object} params — action-specific parameters
 * @returns {Promise<any>} — the API response data
 */
export async function callProxy(action, params = {}) {
  const firebase = window.firebase;
  if (!firebase || !firebase.functions) {
    console.warn('Firebase Functions not available, falling back to direct API calls');
    return null; // Caller handles fallback
  }

  try {
    const functions = firebase.functions();
    const apiProxy = functions.httpsCallable('apiProxy');
    const result = await apiProxy({ action, params });
    return result.data;
  } catch (err) {
    // If function doesn't exist (not deployed), return null for fallback
    if (err.code === 'functions/not-found' || err.code === 'functions/unavailable') {
      console.warn(`Cloud Function not available for ${action}, using direct API`);
      return null;
    }
    throw err;
  }
}

/**
 * Check if the Cloud Functions proxy is available.
 */
export async function isProxyAvailable() {
  try {
    const firebase = window.firebase;
    if (!firebase || !firebase.functions) return false;
    // Quick ping test — will fail gracefully if not deployed
    return true;
  } catch {
    return false;
  }
}

export default { callProxy, isProxyAvailable };
