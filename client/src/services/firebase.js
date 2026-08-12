import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA51gDGvIJ01cwLGRiqwNVxAkNUWfr5WcE',
  authDomain: 'quizzhp-3729a.firebaseapp.com',
  projectId: 'quizzhp-3729a',
  storageBucket: 'quizzhp-3729a.firebasestorage.app',
  messagingSenderId: '511564005836',
  appId: '1:511564005836:web:fa8075e18dd34b47535d69',
  measurementId: 'G-XC6SB8RM4J'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) getAnalytics(app);
  }).catch(() => {});
}

export default app;
