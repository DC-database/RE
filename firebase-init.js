/* --- firebase-init.js ---
   Firebase (Auth + Realtime Database) bootstrap for the demo.
   Uses the modular Firebase Web SDK via CDN imports.

   Data is stored per-user under: /users/<uid>/db
*/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js';
import { getDatabase, ref, get, set } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';

// Hard-coded admin UID for demo (replace with custom claims in production).
// You provided this UID:
const ADMIN_UID = '030uyDPSwxTftK7JgY5eedclzgs1';

// Your Firebase config (provided by you)
const firebaseConfig = {
  apiKey: 'AIzaSyBkeywuk5EirEyZENNaRW-mXbbCfvK-ZKg',
  authDomain: 'property-76577.firebaseapp.com',
  databaseURL: 'https://property-76577-default-rtdb.firebaseio.com',
  projectId: 'property-76577',
  storageBucket: 'property-76577.firebasestorage.app',
  messagingSenderId: '1028649880088',
  appId: '1:1028649880088:web:76c9900cb9bbdf2bbc916d',
  measurementId: 'G-RWEVEHRFVJ',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Keep the user signed-in across refreshes.
setPersistence(auth, browserLocalPersistence).catch(() => {});

const db = getDatabase(app);

// Secondary app instance used ONLY for creating users without logging out the admin.
const secondaryApp = initializeApp(firebaseConfig, 'secondary');
const secondaryAuth = getAuth(secondaryApp);

function isLoginPage() {
  const page = (location.pathname.split('/').pop() || '').toLowerCase();
  return page === 'login.html';
}

function waitForUserOnce() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

async function requireAuth() {
  const user = await waitForUserOnce();
  if (!user && !isLoginPage()) {
    location.replace('login.html');
    return null;
  }
  return user;
}

async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

function isAdmin(user) {
  return Boolean(user && user.uid === ADMIN_UID);
}

// Create a new user account (admin only). Uses a SECONDARY auth instance so
// the primary session remains logged in as admin.
async function adminCreateUser(email, password) {
  const u = auth.currentUser;
  if (!isAdmin(u)) throw new Error('Admin only');
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  // Sign out the secondary auth so it doesn't persist a second session.
  try { await signOut(secondaryAuth); } catch {}
  return cred;
}

async function logout() {
  return signOut(auth);
}

function userDbPath(uid) {
  return `users/${uid}/db`;
}

async function dbGet(path) {
  return get(ref(db, path));
}

async function dbSet(path, value) {
  return set(ref(db, path), value);
}

// Expose minimal helpers so the rest of the app can stay "plain JS".
window.IBAFirebase = {
  app,
  auth,
  db,
  userDbPath,
  dbGet,
  dbSet,
  ref,
  get,
  set,
};

window.IBAAuth = {
  auth,
  onAuthStateChanged,
  waitForUserOnce,
  requireAuth,
  login,
  logout,
  isAdmin: () => isAdmin(auth.currentUser),
  adminCreateUser,
  getUser: () => auth.currentUser,
};

window.IBAAdmin = { ADMIN_UID };
