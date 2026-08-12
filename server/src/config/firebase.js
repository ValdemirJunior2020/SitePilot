import admin from 'firebase-admin';

let firebaseApp = null;

export function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;
  if (admin.apps.length) {
    firebaseApp = admin.app();
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    const error = new Error('Firebase Admin is not configured. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to server/.env.');
    error.status = 503;
    throw error;
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    projectId,
    ...(storageBucket ? { storageBucket } : {})
  });
  return firebaseApp;
}

export function getDb() {
  getFirebaseApp();
  return admin.firestore();
}

export function getAdminAuth() {
  getFirebaseApp();
  return admin.auth();
}

export function getBucket() {
  getFirebaseApp();
  if (!process.env.FIREBASE_STORAGE_BUCKET) return null;
  return admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
}

export { admin };
