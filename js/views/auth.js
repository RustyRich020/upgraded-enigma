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
        <div style="margin-bottom:32px;">
          <div class="landing-logo" style="width:80px;height:80px;margin:0 auto 20px;">
            <div class="logo-text" style="font-size:32px;">T</div>
          </div>
          <h2 style="margin-bottom:8px;">${mode === 'reset' ? 'RESET PASSWORD' : mode === 'signup' ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</h2>
          <p class="muted" style="font-size:12px;">${mode === 'reset' ? 'Enter your email to receive a reset link' : 'Track your job search with cloud sync'}</p>
        </div>

        ${mode !== 'reset' ? `
        <div class="auth-tabs">
          <button class="auth-tab ${mode === 'signup' ? 'active' : ''}" data-mode="signup">SIGN UP</button>
          <button class="auth-tab ${mode === 'signin' ? 'active' : ''}" data-mode="signin">SIGN IN</button>
        </div>` : ''}

        ${error ? `<div class="auth-error">${error}</div>` : ''}
        ${success ? `<div class="auth-success">${success}</div>` : ''}

        <form id="authForm" class="auth-form" novalidate>
          <label style="display:block;margin:12px 0;">
            <h4>EMAIL</h4>
            <input id="authEmail" type="email" class="input" placeholder="you@example.com" required autocomplete="email">
          </label>

          ${mode !== 'reset' ? `
          <label style="display:block;margin:12px 0;">
            <h4>PASSWORD</h4>
            <input id="authPassword" type="password" class="input" placeholder="${mode === 'signup' ? 'Min 8 characters' : 'Your password'}" required autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" minlength="8">
          </label>` : ''}

          ${mode === 'signup' ? `
          <label style="display:block;margin:12px 0;">
            <h4>CONFIRM PASSWORD</h4>
            <input id="authPasswordConfirm" type="password" class="input" placeholder="Re-enter password" required autocomplete="new-password" minlength="8">
          </label>` : ''}

          <button type="submit" class="btn brand large" id="authSubmitBtn" style="width:100%;margin-top:16px;" ${loading ? 'disabled' : ''}>
            ${loading ? '<span class="spinner"></span>' : mode === 'signup' ? 'CREATE ACCOUNT' : mode === 'signin' ? 'SIGN IN' : 'SEND RESET LINK'}
          </button>
        </form>

        ${mode === 'signin' ? `
        <div style="text-align:center;margin-top:12px;">
          <button class="auth-link" id="authForgotLink">Forgot your password?</button>
        </div>` : ''}

        ${mode === 'reset' ? `
        <div style="text-align:center;margin-top:12px;">
          <button class="auth-link" id="authBackToSignin">Back to Sign In</button>
        </div>` : ''}

        <div class="auth-divider"><span>or</span></div>

        <button class="btn ghost" id="authGuest" style="width:100%;">CONTINUE AS GUEST</button>

        <div style="text-align:center;margin-top:16px;">
          ${mode === 'signup' ? `<span class="muted" style="font-size:12px;">Already have an account? </span><button class="auth-link" id="authToggle">Sign In</button>` : ''}
          ${mode === 'signin' ? `<span class="muted" style="font-size:12px;">Don't have an account? </span><button class="auth-link" id="authToggle">Sign Up</button>` : ''}
        </div>
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
