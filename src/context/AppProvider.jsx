import { useCallback, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { AppContext } from './AppContext';
import { auth, firebaseConfigurationError } from '../lib/firebase';
import { readStorage, writeStorage } from '../lib/storage';
import {
  authenticationUnavailableMessage,
  getAuthErrorMessage,
} from '../services/auth';

function toUserProfile(firebaseUser) {
  if (!firebaseUser) return null;
  return {
    id: firebaseUser.uid,
    name:
      firebaseUser.displayName ||
      firebaseUser.email?.split('@')[0] ||
      'Learner',
    email: firebaseUser.email || '',
  };
}

function requireAuthentication() {
  if (!auth || firebaseConfigurationError) {
    throw Object.assign(new Error(authenticationUnavailableMessage), {
      code: 'auth/configuration-missing',
    });
  }
  return auth;
}

function loadFavorites(user) {
  if (!user) return [];
  const values = readStorage(`learnlingo:favorites:${user.id}`, []);
  return Array.isArray(values)
    ? values.filter((id) => typeof id === 'string')
    : [];
}

export default function AppProvider({ children, theme }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(auth));
  const [authError, setAuthError] = useState(
    auth && !firebaseConfigurationError ? '' : authenticationUnavailableMessage,
  );
  const [signingOut, setSigningOut] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [modal, setModal] = useState(null);
  const [notification, setNotification] = useState(null);

  const syncUser = useCallback((firebaseUser) => {
    const profile = toUserProfile(firebaseUser);
    setUser(profile);
    setFavoriteIds(loadFavorites(profile));
    setAuthError('');
    setAuthLoading(false);
    return profile;
  }, []);

  useEffect(() => {
    if (!auth) return undefined;

    return onAuthStateChanged(auth, syncUser, (error) => {
      setUser(null);
      setFavoriteIds([]);
      setAuthError(getAuthErrorMessage(error));
      setAuthLoading(false);
    });
  }, [syncUser]);

  const notify = useCallback((message) => {
    setNotification({ message, id: Date.now() });
  }, []);

  const openAuth = useCallback(
    (mode = 'login') => setModal({ type: 'auth', mode }),
    [],
  );
  const openBooking = useCallback(
    (teacher) => setModal({ type: 'booking', teacher }),
    [],
  );
  const closeModal = useCallback(() => setModal(null), []);

  const signIn = async ({ email, password }) => {
    try {
      const credential = await signInWithEmailAndPassword(
        requireAuthentication(),
        email.trim(),
        password,
      );
      const profile = syncUser(credential.user);
      notify(`Welcome back, ${profile.name}.`);
      return profile;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const signUp = async ({ name, email, password }) => {
    let credential;
    try {
      credential = await createUserWithEmailAndPassword(
        requireAuthentication(),
        email.trim(),
        password,
      );
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }

    let nameSaved = true;
    try {
      await updateProfile(credential.user, { displayName: name.trim() });
    } catch {
      nameSaved = false;
    }

    const profile = toUserProfile(credential.user);
    if (auth.currentUser?.uid !== credential.user.uid) return profile;
    syncUser(credential.user);
    notify(
      nameSaved
        ? `Welcome, ${profile.name}. Your account is ready.`
        : 'Your account was created, but we could not save your name. You can still use your account.',
    );
    return profile;
  };

  const signOut = async () => {
    if (signingOut) return false;
    setSigningOut(true);
    try {
      await firebaseSignOut(requireAuthentication());
      syncUser(null);
      closeModal();
      notify('You have been logged out.');
      return true;
    } catch (error) {
      notify(getAuthErrorMessage(error));
      return false;
    } finally {
      setSigningOut(false);
    }
  };

  const resetPassword = async ({ email }) => {
    try {
      await sendPasswordResetEmail(requireAuthentication(), email.trim());
    } catch (error) {
      if (error?.code === 'auth/user-not-found') return;
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const toggleFavorite = (teacher) => {
    if (authLoading || signingOut) {
      notify('Your session is still loading. Please try again shortly.');
      return;
    }
    if (!user) {
      setModal({ type: 'favorite-access' });
      return;
    }
    const id = String(teacher.id);
    const next = favoriteIds.includes(id)
      ? favoriteIds.filter((value) => value !== id)
      : [...favoriteIds, id];
    if (!writeStorage(`learnlingo:favorites:${user.id}`, next)) {
      notify(
        'Your browser could not save this change. Favorites will last until you refresh.',
      );
    }
    setFavoriteIds(next);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        authError,
        signingOut,
        theme,
        favoriteIds,
        modal,
        notification,
        notify,
        dismissNotification: () => setNotification(null),
        openAuth,
        openBooking,
        closeModal,
        signIn,
        signUp,
        signOut,
        resetPassword,
        toggleFavorite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
