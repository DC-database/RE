/* --- login.js --- */

(function () {
  const U = window.IBACommon;
  const A = window.IBAAuth;
  if (!U || !A) return;

  const { qs, toast } = U;

  async function go() {
    const email = (qs('#email').value || '').trim();
    const password = qs('#password').value || '';

    if (!email) return toast('Email is required', 'error');
    if (!password || password.length < 6) return toast('Password must be at least 6 characters', 'error');

    try {
      await A.login(email, password);
      toast('Logged in. Redirecting...', 'success');
      setTimeout(() => location.replace('index.html'), 200);
    } catch (e) {
      const msg = (e && e.message) ? e.message : 'Login failed';
      toast(msg, 'error');
      console.error(e);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // If already logged in, go straight to the app.
    try {
      const user = await A.waitForUserOnce();
      if (user) {
        location.replace('index.html');
        return;
      }
    } catch {}

    qs('#btnSubmit').addEventListener('click', go);

    qs('#btnDemo').addEventListener('click', () => {
      // Helps during demo: fill admin email. (Password is intentionally NOT filled.)
      qs('#email').value = 'admin@firebase.com';
      toast('Filled admin email. Enter password to login.', 'success');
    });

    // Enter key to submit
    ['#email', '#password'].forEach((sel) => {
      const el = qs(sel);
      if (!el) return;
      el.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') go();
      });
    });
  });
})();
