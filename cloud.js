import { firebaseConfig } from './firebase-config.js';
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocs, setDoc, deleteDoc, collection, writeBatch, onSnapshot }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const $ = s => document.querySelector(s);
const CHUNK = 250000; // chars per Firestore doc (limit is ~1MB bytes)
const clientId = Math.random().toString(36).slice(2);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const fs = getFirestore(app);
let profile = null, booted = false, dirty = false, timer = null, saving = false, lastRev = 0, lastLogo = null, unsub = null;

const setSync = t => { const e = $('#syncState'); if (e) e.textContent = t; };
const err = m => { $('#loginErr').textContent = m || ''; };

async function loadCloud() {
  const meta = await getDoc(doc(fs, 'erp', 'meta'));
  if (!meta.exists()) return null;
  const m = meta.data(); let txt = '';
  for (let i = 0; i < m.n; i++) { const c = await getDoc(doc(fs, 'erp', 'data_' + i)); txt += c.data().t; }
  const d = JSON.parse(txt);
  const lg = await getDoc(doc(fs, 'erp', 'logo'));
  if (lg.exists() && lg.data().data) d.settings.logo = lg.data().data;
  lastRev = m.rev; lastLogo = d.settings.logo || null;
  return d;
}

async function writeCloud() {
  if (saving) return; saving = true; dirty = false;
  try {
    setSync('Saving…');
    const d = JSON.parse(JSON.stringify(DB)); const logo = d.settings.logo || null; delete d.settings.logo;
    const txt = JSON.stringify(d); const n = Math.ceil(txt.length / CHUNK) || 1;
    const old = (await getDoc(doc(fs, 'erp', 'meta'))).data();
    const rev = Date.now(); const b = writeBatch(fs);
    for (let i = 0; i < n; i++) b.set(doc(fs, 'erp', 'data_' + i), { t: txt.slice(i * CHUNK, (i + 1) * CHUNK) });
    if (old) for (let i = n; i < old.n; i++) b.delete(doc(fs, 'erp', 'data_' + i));
    if (logo !== lastLogo) { logo ? b.set(doc(fs, 'erp', 'logo'), { data: logo }) : b.delete(doc(fs, 'erp', 'logo')); }
    b.set(doc(fs, 'erp', 'meta'), { n, rev, by: clientId, byEmail: profile.email });
    await b.commit();
    lastRev = rev; lastLogo = logo; setSync('Saved to cloud ✓');
  } catch (e) { console.error(e); dirty = true; setSync('⚠ Save failed — retrying'); setTimeout(() => window.cloudSave(), 5000); }
  finally { saving = false; if (dirty && !timer) window.cloudSave(); }
}
window.cloudSave = () => { if (!booted) return; dirty = true; setSync('Unsaved changes…'); clearTimeout(timer); timer = setTimeout(() => { timer = null; writeCloud(); }, 1200); };
window.addEventListener('beforeunload', e => { if (dirty || saving) { e.preventDefault(); e.returnValue = ''; } });

function watch() {
  unsub = onSnapshot(doc(fs, 'erp', 'meta'), async s => {
    if (!s.exists()) return; const m = s.data();
    if (m.by === clientId || m.rev <= lastRev || dirty || saving) return;
    try { const d = await loadCloud(); if (d && !document.querySelector('.modal-bg,.modal')) { window.bootApp(d); setSync('Updated by ' + (m.byEmail || 'another user')); } } catch (e) { console.error(e); }
  });
}

/* ---------- Users management (admin) ---------- */
async function listUsers() { const q = await getDocs(collection(fs, 'users')); return q.docs.map(d => ({ uid: d.id, ...d.data() })); }
async function createUser(email, name, role, pass) {
  const sec = initializeApp(firebaseConfig, 'sec' + Date.now());
  try {
    const cred = await createUserWithEmailAndPassword(getAuth(sec), email, pass);
    await setDoc(doc(fs, 'users', cred.user.uid), { email, name, role, active: true, created: Date.now() });
    await signOut(getAuth(sec));
  } finally { await deleteApp(sec); }
}
function patchSettings() {
  if (profile.role !== 'admin') {
    const m0 = mounts.settings;
    mounts.settings = () => { m0(); ['clr', 'rs', 'smp'].forEach(id => { const e = document.getElementById(id); if (e) (e.closest('label') || e).remove(); }); };
    return;
  }
  const v0 = views.settings, m0 = mounts.settings;
  views.settings = () => v0() + `<div class="card" style="margin-top:14px"><h3>Login users</h3>
    <div id="usersList" style="margin-bottom:12px">Loading…</div>
    <div class="form"><label>Name<input id="nu_name"></label><label>Email<input id="nu_email" type="email"></label><label>Password (min 6)<input id="nu_pass" type="text"></label>
    <label>Role<select id="nu_role"><option value="user">User</option><option value="admin">Admin</option></select></label></div>
    <div style="margin-top:10px"><button class="btn pri" id="nu_add">+ Add login user</button></div></div>`;
  mounts.settings = () => {
    m0();
    const g = id => document.getElementById(id);
    const draw = async () => {
      const us = await listUsers();
      g('usersList').innerHTML = '<table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>' +
        us.map(u => `<tr><td>${esc(u.name || '')}</td><td>${esc(u.email)}</td><td>${u.role}</td><td>${u.active ? 'Active' : 'Disabled'}</td><td style="white-space:nowrap">
        <button class="btn" data-t="${u.uid}">${u.active ? 'Disable' : 'Enable'}</button> <button class="btn" data-r="${u.uid}" data-e="${esc(u.email)}">Reset password</button>
        ${u.uid === auth.currentUser.uid ? '' : `<button class="btn dng" data-d="${u.uid}">Remove</button>`}</td></tr>`).join('') + '</tbody></table>';
      document.querySelectorAll('[data-t]').forEach(b => b.onclick = async () => { const u = us.find(x => x.uid === b.dataset.t); if (u.uid === auth.currentUser.uid) return alert('You cannot disable yourself.'); const { uid, ...rest } = u; await setDoc(doc(fs, 'users', uid), { ...rest, active: !u.active }); draw(); });
      document.querySelectorAll('[data-r]').forEach(b => b.onclick = async () => { await sendPasswordResetEmail(auth, b.dataset.e); toast('Reset email sent'); });
      document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (!confirm('Remove this user\'s access?')) return; await deleteDoc(doc(fs, 'users', b.dataset.d)); draw(); });
    };
    draw().catch(e => g('usersList').textContent = 'Could not load users: ' + e.message);
    g('nu_add').onclick = async () => {
      const name = g('nu_name').value.trim(), email = g('nu_email').value.trim(), pass = g('nu_pass').value, role = g('nu_role').value;
      if (!email || pass.length < 6) return alert('Enter an email and a password of at least 6 characters.');
      try { await createUser(email, name, role, pass); toast('User created'); ['nu_name', 'nu_email', 'nu_pass'].forEach(i => g(i).value = ''); draw(); }
      catch (e) { alert('Could not create user: ' + e.message); }
    };
  };
}

/* ---------- Auth gate ---------- */
$('#loginForm').onsubmit = async e => {
  e.preventDefault(); err(''); $('#lgBtn').disabled = true;
  try { await signInWithEmailAndPassword(auth, $('#lgEmail').value.trim(), $('#lgPass').value); }
  catch (x) { err(/invalid|wrong|user-not-found|credential/i.test(x.code + x.message) ? 'Wrong email or password.' : x.message); }
  $('#lgBtn').disabled = false;
};
$('#logoutBtn').onclick = () => signOut(auth).then(() => location.reload());

onAuthStateChanged(auth, async u => {
  if (!u) { $('#loginGate').style.display = 'flex'; return; }
  try {
    const p = await getDoc(doc(fs, 'users', u.uid));
    if (!p.exists() || !p.data().active) { err('This account has no access. Ask an admin.'); await signOut(auth); return; }
    profile = p.data();
    $('#loginGate').querySelector('.box').insertAdjacentHTML('beforeend', '');
    $('#lgBtn').textContent = 'Loading data…';
    const d = await loadCloud();
    window.bootApp(d); booted = true;
    if (!d) { booted = true; window.cloudSave(); }
    patchSettings(); watch();
    $('#whoami').textContent = (profile.name || profile.email) + ' (' + profile.role + ')';
    $('#loginGate').style.display = 'none'; $('#lgBtn').textContent = 'Sign in'; setSync('Connected to cloud ✓');
  } catch (e) { console.error(e); err('Error: ' + e.message); $('#lgBtn').textContent = 'Sign in'; }
});
