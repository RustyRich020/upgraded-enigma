/* ============================================================
   views/auth.js — Sign Up / Sign In / Reset Password view
   ============================================================ */

import { signUpWithEmail, signInWithEmail, signInAnonymously, resetPassword } from '../firebase/auth.js';

/**
 * Render the authentication view with tabbed Sign Up / Sign In.
 * @param {HTMLElement} container
 * @param {object} callbacks — { onAuthSuccess(user), onGuestAccess(user) }
 */
export function renderAuth(container, callbacks = {}) {
  let mode = sessionStorage.getItem('authMode') || 'signup';
  sessionStorage.removeItem('authMode');
  let loading = false;
  let error = null;
  let success = null;

  function render() {
    container.innerHTML = `
      <div class="auth-container">
        <div class="auth-header">
          <div class="auth-logo">
            <img src="assets/icons/logo.svg" alt="JobSink" width="64" height="64" style="border-radius:14px">
          </div>
          <h2>${mode === 'reset' ? 'Reset Password' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>
          <p>${mode === 'reset' ? 'Enter your email to receive a reset link' : 'Track your job search with cloud sync'}</p>
        </div>

        ${mode !== 'reset' ? `
        <div class="auth-tabs">
          <button type="button" class="auth-tab ${mode === 'signup' ? 'active' : ''}" data-mode="signup">Sign Up</button>
          <button type="button" class="auth-tab ${mode === 'signin' ? 'active' : ''}" data-mode="signin">Sign In</button>
        </div>` : ''}

        ${error ? `<div class="auth-error" role="alert">${error}</div>` : ''}
        ${success ? `<div class="auth-success" role="status">${success}</div>` : ''}

        <form id="authForm" class="auth-form" novalidate>
          <label class="auth-field">
            <span class="auth-field-label">Email</span>
            <input id="authEmail" type="email" class="input" placeholder="you@example.com" required autocomplete="email">
          </label>

          ${mode !== 'reset' ? `
          <label class="auth-field">
            <span class="auth-field-label">Password</span>
            <input id="authPassword" type="password" class="input" placeholder="${mode === 'signup' ? 'Min 8 characters' : 'Your password'}" required autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" minlength="8">
          </label>` : ''}

          ${mode === 'signup' ? `
          <label class="auth-field">
            <span class="auth-field-label">Confirm Password</span>
            <input id="authPasswordConfirm" type="password" class="input" placeholder="Re-enter password" required autocomplete="new-password" minlength="8">
          </label>` : ''}

          <button type="submit" class="btn brand large auth-submit" id="authSubmitBtn" ${loading ? 'disabled' : ''}>
            ${loading ? '<span class="spinner"></span>' : mode === 'signup' ? 'Create Account' : mode === 'signin' ? 'Sign In' : 'Send Reset Link'}
          </button>
        </form>

        ${mode === 'signin' ? `
        <div class="auth-footer-link">
          <button type="button" class="auth-link" id="authForgotLink">Forgot your password?</button>
        </div>` : ''}

        ${mode === 'reset' ? `
        <div class="auth-footer-link">
          <button type="button" class="auth-link" id="authBackToSignin">Back to Sign In</button>
        </div>` : ''}

        <div class="auth-divider"><span>or</span></div>

        <button type="button" class="btn ghost auth-submit" id="authGuest">Continue as Guest</button>

        <div class="auth-toggle-row">
          ${mode === 'signup' ? `<span class="muted">Already have an account? </span><button type="button" class="auth-link" id="authToggle">Sign In</button>` : ''}
          ${mode === 'signin' ? `<span class="muted">Don't have an account? </span><button type="button" class="auth-link" id="authToggle">Sign Up</button>` : ''}
        </div>

        <button type="button" class="auth-home-link" id="authBackHome">\u2190 Back to home</button>

        <style>
          #view-auth {
            background:
              radial-gradient(ellipse at 50% 0%, rgba(196,123,58,0.06), transparent 50%),
              radial-gradient(ellipse at 80% 100%, rgba(45,139,95,0.04), transparent 40%);
            min-height: calc(100vh - var(--header-height, 56px));
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .auth-container {
            max-width: 420px;
            margin: 0 auto;
            padding: 48px 24px 32px;
          }
          .auth-logo {
            width: 80px; height: 80px;
            margin: 0 auto 24px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(196,123,58,0.15);
          }
          .auth-header {
            text-align: center;
            margin-bottom: 28px;
          }
          .auth-header h2 {
            font-family: var(--font-display);
            font-size: 24px;
            font-weight: 700;
            color: var(--color-text-heading);
            margin-bottom: 6px;
            letter-spacing: -0.02em;
          }
          .auth-header p {
            font-size: 14px;
            color: var(--color-text-dim);
          }
          .auth-field {
            display: block;
            margin: 16px 0;
          }
          .auth-field-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--color-text-dim);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            display: block;
          }
          .auth-submit {
            width: 100%;
            margin-top: 20px;
          }
          .auth-footer-link {
            text-align: center;
            margin-top: 12px;
          }
          .auth-toggle-row {
            text-align: center;
            margin-top: 16px;
          }
          .auth-home-link {
            display: block;
            text-align: center;
            margin-top: 24px;
            background: none;
            border: none;
            font-size: 13px;
            color: var(--color-muted);
            cursor: pointer;
            font-family: var(--font-body);
            transition: color 0.15s;
          }
          .auth-home-link:hover { color: var(--color-primary); }
        </style>
      </div>
    `;

    // Tab clicks
    container.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        mode = tab.dataset.mode;
        error = null; success = null;
        render();
      });
    });

    // Toggle link
    container.querySelector('#authToggle')?.addEventListener('click', () => {
      mode = mode === 'signup' ? 'signin' : 'signup';
      error = null; success = null;
      render();
    });

    // Forgot password
    container.querySelector('#authForgotLink')?.addEventListener('click', () => {
      mode = 'reset';
      error = null; success = null;
      render();
    });

    // Back to sign in
    container.querySelector('#authBackToSignin')?.addEventListener('click', () => {
      mode = 'signin';
      error = null; success = null;
      render();
    });

    // Back to home
    container.querySelector('#authBackHome')?.addEventListener('click', () => {
      window.location.hash = '#landing';
    });

    // Guest access
    container.querySelector('#authGuest')?.addEventListener('click', async () => {
      loading = true; error = null; render();
      try {
        const user = await signInAnonymously();
        if (user && callbacks.onGuestAccess) callbacks.onGuestAccess(user);
      } catch (e) {
        error = 'Guest access failed. Please try again.';
        loading = false; render();
      }
    });

    // Form submit
    container.querySelector('#authForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = container.querySelector('#authEmail')?.value?.trim();
      const password = container.querySelector('#authPassword')?.value;
      const confirmPassword = container.querySelector('#authPasswordConfirm')?.value;

      // Validate
      error = null; success = null;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        error = 'Please enter a valid email address.';
        render(); return;
      }

      if (mode !== 'reset') {
        if (!password || password.length < 8) {
          error = 'Password must be at least 8 characters.';
          render(); return;
        }
        if (mode === 'signup' && password !== confirmPassword) {
          error = 'Passwords do not match.';
          render(); return;
        }
      }

      loading = true; render();

      try {
        if (mode === 'signup') {
          const user = await signUpWithEmail(email, password);
          if (callbacks.onAuthSuccess) callbacks.onAuthSuccess(user);
        } else if (mode === 'signin') {
          const user = await signInWithEmail(email, password);
          if (callbacks.onAuthSuccess) callbacks.onAuthSuccess(user);
        } else if (mode === 'reset') {
          await resetPassword(email);
          success = 'Password reset email sent! Check your inbox.';
          loading = false; render();
        }
      } catch (err) {
        error = err.message || 'Authentication failed. Please try again.';
        loading = false; render();
      }
    });
  }

  render();
}

export default { renderAuth };
