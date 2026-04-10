/* ============================================================
   firebase/auth.js — Authentication (Email/Password + Anonymous)
   ============================================================ */

/**
 * Map Firebase error codes to user-friendly messages.
 */
function mapAuthError(code) {
  const map = {
    'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
    'auth/credential-already-in-use': 'This credential is already linked to another account.',
    'auth/requires-recent-login': 'Please sign in again before making this change.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  };
  return map[code] || 'Authentication error. Please try again.';
}

function getAuth() {
  const fb = window.firebase;
  if (!fb || !fb.auth) return null;
  return fb.auth();
}

/**
 * Sign up with email and password.
 * @returns {object} user object
 * @throws {object} { code, message }
 */
export async function signUpWithEmail(email, password) {
  const auth = getAuth();
  if (!auth) throw { code: 'auth/unavailable', message: 'Firebase Auth not available' };
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    return result.user;
  } catch (e) {
    throw { code: e.code, message: mapAuthError(e.code) };
  }
}

/**
 * Sign in with email and password.
 * @returns {object} user object
 * @throws {object} { code, message }
 */
export async function signInWithEmail(email, password) {
  const auth = getAuth();
  if (!auth) throw { code: 'auth/unavailable', message: 'Firebase Auth not available' };
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    return result.user;
  } catch (e) {
    throw { code: e.code, message: mapAuthError(e.code) };
  }
}

/**
 * Sign in anonymously.
 * @returns {object|null} user object or null
 */
export async function signInAnonymously() {
  const auth = getAuth();
  if (!auth) { console.warn('Firebase Auth not available'); return null; }
  try {
    const result = await auth.signInAnonymously();
    return result.user;
  } catch (e) {
    console.warn('Anonymous sign-in failed:', e);
    return null;
  }
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const auth = getAuth();
  if (!auth) return;
  try {
    await auth.signOut();
  } catch (e) {
    console.warn('Sign out failed:', e);
  }
}

/**
 * Send a password reset email.
 * @throws {object} { code, message }
 */
export async function resetPassword(email) {
  const auth = getAuth();
  if (!auth) throw { code: 'auth/unavailable', message: 'Firebase Auth not available' };
  try {
    await auth.sendPasswordResetEmail(email);
  } catch (e) {
    throw { code: e.code, message: mapAuthError(e.code) };
  }
}

/**
 * Upgrade an anonymous user to email/password.
 * Preserves the same UID so Firestore data stays intact.
 * @throws {object} { code, message }
 */
export async function upgradeAnonymousToEmail(email, password) {
  const auth = getAuth();
  if (!auth) throw { code: 'auth/unavailable', message: 'Firebase Auth not available' };
  const user = auth.currentUser;
  if (!user || !user.isAnonymous) throw { code: 'auth/not-anonymous', message: 'Current user is not anonymous' };
  try {
    const credential = window.firebase.auth.EmailAuthProvider.credential(email, password);
    const result = await user.linkWithCredential(credential);
    return result.user;
  } catch (e) {
    throw { code: e.code, message: mapAuthError(e.code) };
  }
}

/**
 * Check if the current user is anonymous.
 */
export function isAnonymous() {
  const user = getCurrentUser();
  return user ? user.isAnonymous : true;
}

/**
 * Get the current authenticated user, or null.
 */
export function getCurrentUser() {
  const auth = getAuth();
  return auth ? auth.currentUser : null;
}

/**
 * Get a profile object from the current user.
 */
export function getUserProfile() {
  const user = getCurrentUser();
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    isAnonymous: user.isAnonymous,
    providerId: user.providerData?.[0]?.providerId || (user.isAnonymous ? 'anonymous' : 'unknown')
  };
}

/**
 * Listen for auth state changes.
 * @param {Function} cb — called with (user) on each change
 * @returns {Function} unsubscribe function
 */
export function onAuthChange(cb) {
  const auth = getAuth();
  if (!auth) return () => {};
  return auth.onAuthStateChanged(cb);
}

export default {
  signUpWithEmail, signInWithEmail, signInAnonymously,
  signOut, resetPassword, upgradeAnonymousToEmail,
  isAnonymous, getCurrentUser, getUserProfile, onAuthChange
};
