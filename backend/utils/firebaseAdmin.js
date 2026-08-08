const { initializeApp, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

// Verifying an ID token's signature only needs the project ID (Admin SDK fetches Google's
// public certs over HTTPS) - no service account credential required for this operation.
if (!getApps().length) {
  initializeApp({ projectId: process.env.VITE_FIREBASE_PROJECT_ID });
}

// Throws if the token is missing/expired/forged/for the wrong project - callers must catch.
// Returns the verified claims (email, name, picture, email_verified, ...), never trust the
// same-named fields from the request body instead.
async function verifyFirebaseIdToken(idToken) {
  return getAuth().verifyIdToken(idToken);
}

module.exports = { verifyFirebaseIdToken };
