import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth, getUserRole, ensureUserDoc, logActivity, setUserRole, grantSignupStamp, ensureRewardDoc } from '../firebase';

const approvedEmails = ['kruger.rualdo@gmail.com']; // fallback allowlist

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const redirectHandledRef = useRef(false);
  const redirectUidRef = useRef(null);

  useEffect(() => {
    let unsub = null;

    const handleUser = async (u) => {
      setError('');
      try {
        const userDocResult = await ensureUserDoc(u.uid, u.email);
        await ensureRewardDoc(u.uid, u.email);
        const fetchedRole = await getUserRole(u.uid);
        const fallbackRole = approvedEmails.includes(u.email) ? 'admin' : 'user';
        const finalRole = fetchedRole || fallbackRole;

        // Auto-promote if this email is in the allowlist and no role was found
        if (!fetchedRole && fallbackRole === 'admin') {
          await setUserRole(u.uid, u.email || '', 'admin');
        }

        setUser(u);
        logActivity({ type: 'login', uid: u.uid, email: u.email || '', role: finalRole });
        if (userDocResult?.created) {
          await grantSignupStamp(u.uid, u.email || '');
          await logActivity({ type: 'signup_bonus', uid: u.uid, email: u.email || '' });
        }
        setRole(finalRole);
        return true;
      } catch (e) {
        setError(e.message || 'Unable to load role');
        return false;
      } finally {
        setLoading(false);
      }
    };

    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (e) {
        // If persistence fails (Safari/ITP), continue with default so users can still sign in
        console.warn('Auth persistence fallback', e?.message || e);
      }

      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          const handled = await handleUser(redirectResult.user);
          if (handled) {
            redirectHandledRef.current = true;
            redirectUidRef.current = redirectResult.user.uid;
          }
        }
      } catch (e) {
        setError(e.message || 'Unable to complete Google sign-in');
      }

      unsub = onAuthStateChanged(auth, async (u) => {
        setError('');
        if (!u) {
          setUser(null);
          setRole(null);
          setLoading(false);
          redirectHandledRef.current = false;
          redirectUidRef.current = null;
          return;
        }
        if (redirectHandledRef.current && redirectUidRef.current === u.uid) {
          redirectHandledRef.current = false;
          redirectUidRef.current = null;
          setLoading(false);
          return;
        }
        await handleUser(u);
      });
    };

    initAuth();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, error, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
