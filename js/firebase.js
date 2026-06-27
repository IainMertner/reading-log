import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── Config ───────────────────────────────────────────────────────────────────
// Replace these with the values from your Firebase project:
// Firebase console → Project settings → Your apps → Web → SDK setup → Config
const firebaseConfig = {
  apiKey:            "AIzaSyBExnP_07GT_hP8olJbHhlWKvNMIxG75r0",
  authDomain:        "reading-log-ba9a5.firebaseapp.com",
  projectId:         "reading-log-ba9a5",
  storageBucket:     "reading-log-ba9a5.firebasestorage.app",
  messagingSenderId: "31148199647",
  appId:             "1:31148199647:web:a96cfe745add1640d1a36a"
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Base URL of the app, works on any host (GitHub Pages, localhost, etc.)
export const ROOT = new URL('..', import.meta.url).href;

// Firebase Auth requires an email address internally.
// We synthesise one from the username so the user never has to provide one.
function toEmail(username) {
  return `${username}@readinglog.local`;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signUp(username, password) {
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new Error('Username must be 3–20 characters: lowercase letters, numbers, underscores.');
  }
  const taken = await getDoc(doc(db, 'usernames', username));
  if (taken.exists()) throw new Error('That username is already taken.');

  const cred = await createUserWithEmailAndPassword(auth, toEmail(username), password);
  const uid  = cred.user.uid;

  await Promise.all([
    setDoc(doc(db, 'users', uid),          { username, createdAt: serverTimestamp(), friends: [] }),
    setDoc(doc(db, 'usernames', username), { uid })
  ]);

  return cred.user;
}

export function signIn(username, password) {
  return signInWithEmailAndPassword(auth, toEmail(username), password);
}

export function logOut() {
  return fbSignOut(auth);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

export async function getFriends(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return [];
  const uids = snap.data().friends || [];
  if (!uids.length) return [];
  const snaps = await Promise.all(uids.map(id => getDoc(doc(db, 'users', id))));
  return snaps.filter(s => s.exists()).map(s => ({ uid: s.id, ...s.data() }));
}

export async function addFriend(currentUid, friendUsername) {
  const lower       = friendUsername.toLowerCase();
  const usernameRef = await getDoc(doc(db, 'usernames', lower));
  if (!usernameRef.exists()) throw new Error('No user found with that username.');

  const friendUid = usernameRef.data().uid;
  if (friendUid === currentUid) throw new Error('You cannot add yourself.');

  const mySnap = await getDoc(doc(db, 'users', currentUid));
  if (mySnap.exists() && (mySnap.data().friends || []).includes(friendUid)) {
    throw new Error('Already in your friends list.');
  }

  await updateDoc(doc(db, 'users', currentUid), { friends: arrayUnion(friendUid) });

  const friendSnap = await getDoc(doc(db, 'users', friendUid));
  return { uid: friendUid, ...friendSnap.data() };
}

// ── Books ─────────────────────────────────────────────────────────────────────

export async function getBooks(uid) {
  const q    = query(collection(db, 'users', uid, 'books'), orderBy('addedAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addBook(uid, { title, author, totalPages }) {
  const ref = await addDoc(collection(db, 'users', uid, 'books'), {
    title,
    author:      author || '',
    totalPages:  totalPages || 0,
    currentPage: 0,
    status:      'reading',
    addedAt:     serverTimestamp()
  });
  return ref.id;
}

export function updateBookProgress(uid, bookId, currentPage) {
  return updateDoc(doc(db, 'users', uid, 'books', bookId), { currentPage });
}

export function finishBook(uid, bookId) {
  return updateDoc(doc(db, 'users', uid, 'books', bookId), {
    status:      'finished',
    finishedAt:  serverTimestamp()
  });
}
