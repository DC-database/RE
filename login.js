/* --- login.js --- */

(function () {
  const U = window.IBACommon;
  const A = window.IBAAuth;
  if (!U || !A) return;

  const { qs, toast } = U;

  let mode = 'login'; // 'login' | 'register'

  function setMode(next) {
    mode = next;
    const isRegister = mode === 'register';

    qs('#confirmWrap').style.display = isRegister ? 'block' : 'none';
    qs('#submitText').textContent = isRegister ? 'Create Account' : 'Login';
    qs('#btnSubmit i').className = isRegister ? 'fas fa-user-plus' : 'fas fa-right-to-bracket';
    qs('#loginSubtitle').textContent = isRegister
      ? 'Create a demo account (Firebase Auth)'
      : 'Sign in to access your demo data (Firebase)';

    qs('#switchText').textContent = isRegister ? 'Have an account?' : 'No account?';
    qs('#switchLink').textContent = isRegister ? 'Login' : 'Create one';

    // autocomplete hints
    qs('#password').setAttribute('autocomplete', isRegister ? 'new-password' : 'current-password');
  }

  async function go() {
    const email = (qs('#email').value || '').trim();
    const password = qs('#password').value || '';
    const confirm = qs('#confirm').value || '';

    if (!email) return toast('Email is required', 'error');
    if (!password || password.length < 6) return toast('Password must be at least 6 characters', 'error');

    try {
      if (mode === 'register') {
        if (password !== confirm) return toast('Passwords do not match', 'error');
        await A.register(email, password);
        toast('Account created. Redirecting...', 'success');
      } else {
        await A.login(email, password);
        toast('Logged in. Redirecting...', 'success');
      }

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
    qs('#switchLink').addEventListener('click', (e) => {
      e.preventDefault();
      setMode(mode === 'login' ? 'register' : 'login');
    });

    qs('#btnDemo').addEventListener('click', () => {
      // Helps during demo (you can remove later)
      qs('#email').value = 'demo@example.com';
      qs('#password').value = 'Demo1234';
      qs('#confirm').value = 'Demo1234';
      toast('Filled sample credentials. Create account if needed.', 'success');
    });

    // Enter key to submit
    ['#email', '#password', '#confirm'].forEach((sel) => {
      const el = qs(sel);
      if (!el) return;
      el.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') go();
      });
    });

    setMode('login');
  });
})();
