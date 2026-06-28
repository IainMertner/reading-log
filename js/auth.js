import { onAuth, getProfile, repairProfile, ROOT } from './firebase.js';

// Resolves with { user, profile } for authenticated users.
// Redirects to login/ for unauthenticated visitors.
// If the Firestore profile is missing or has no username (broken signup),
// it is repaired automatically from the Firebase Auth email.
export function requireAuth() {
  return new Promise((resolve, reject) => {
    const off = onAuth(async user => {
      off();
      if (!user) {
        window.location.replace(ROOT + 'login/');
        return;
      }
      try {
        let profile = await getProfile(user.uid);
        if (!profile || !profile.username) {
          profile = await repairProfile(user);
        }
        resolve({ user, profile });
      } catch (err) {
        reject(err);
      }
    });
  });
}
