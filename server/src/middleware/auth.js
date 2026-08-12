import { getAdminAuth, getDb, admin } from '../config/firebase.js';

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      const error = new Error('Authentication required.');
      error.status = 401;
      throw error;
    }

    const decoded = await getAdminAuth().verifyIdToken(match[1]);
    req.user = { uid: decoded.uid, email: decoded.email || null, name: decoded.name || null };

    await getDb().collection('users').doc(decoded.uid).set({
      email: decoded.email || null,
      displayName: decoded.name || null,
      lastSeenAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    next();
  } catch (error) {
    if (!error.status) error.status = 401;
    next(error);
  }
}
