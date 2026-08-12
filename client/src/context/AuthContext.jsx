import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '../services/firebase';

const AuthContext = createContext(null);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(email, password) {
      await setPersistence(auth, browserLocalPersistence);
      return signInWithEmailAndPassword(auth, email, password);
    },
    async register(name, email, password) {
      await setPersistence(auth, browserLocalPersistence);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) await updateProfile(result.user, { displayName: name.trim() });
      return result;
    },
    async loginWithGoogle() {
      await setPersistence(auth, browserLocalPersistence);
      return signInWithPopup(auth, provider);
    },
    logout: () => signOut(auth)
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
