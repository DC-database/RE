/* --- version.js ---
   Single source of truth for the demo version.
   (Shown in the sidebar + login screen so you can verify you're on the latest build.)
*/

// Update this when you ship a new build.
window.IBAVersion = {
  version: '1.2.0',
  buildDate: '2026-01-17',
  label() {
    return `v${this.version}`;
  }
};
