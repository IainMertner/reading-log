import { onAuth, getProfile } from './firebase.js';

// Resolves with { user, profile } for authenticated users.
// Redirects to /login/ for unauthenticated visitors.
export function requireAuth() {
  return new Promise((resolve, reject) => {
    const off = onAuth(async user => {
      off();
      if (!user) {
        window.location.replace('/login/');
        return;
      }
      try {
        const profile = await getProfile(user.uid);
        resolve({ user, profile });
      } catch (err) {
        reject(err);
      }
    });
  });
}
