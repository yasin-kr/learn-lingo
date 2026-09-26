import { useCallback, useState } from 'react';
import { AppContext } from './AppContext';
import { readStorage, writeStorage } from '../lib/storage';

function loadUser() {
  const stored = readStorage('learnlingo:preview-user');
  return stored &&
    typeof stored.id === 'string' &&
    typeof stored.name === 'string' &&
    typeof stored.email === 'string'
    ? stored
    : null;
}

function loadFavorites(user) {
  if (!user) return [];
  const values = readStorage(`learnlingo:favorites:${user.id}`, []);
  return Array.isArray(values)
    ? values.filter((id) => typeof id === 'string')
    : [];
}

export default function AppProvider({ children, theme }) {
  const [user, setUser] = useState(loadUser);
  const [favoriteIds, setFavoriteIds] = useState(() =>
    loadFavorites(loadUser()),
  );
  const [modal, setModal] = useState(null);
  const [notification, setNotification] = useState(null);

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

  const startPreviewSession = async ({ name, email }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const profiles = readStorage('learnlingo:preview-profiles', {});
    const safeProfiles =
      profiles && typeof profiles === 'object' && !Array.isArray(profiles)
        ? profiles
        : {};
    const profile = {
      id: normalizedEmail,
      email: normalizedEmail,
      name:
        name?.trim() ||
        safeProfiles[normalizedEmail]?.name ||
        normalizedEmail.split('@')[0],
    };
    writeStorage('learnlingo:preview-profiles', {
      ...safeProfiles,
      [normalizedEmail]: profile,
    });
    writeStorage('learnlingo:preview-user', profile);
    setUser(profile);
    setFavoriteIds(loadFavorites(profile));
    notify(`Welcome, ${profile.name}. Your preview is ready.`);
    return profile;
  };

  const signOut = () => {
    writeStorage('learnlingo:preview-user', null);
    setUser(null);
    setFavoriteIds([]);
    notify('You have been logged out.');
  };

  const toggleFavorite = (teacher) => {
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
        theme,
        favoriteIds,
        modal,
        notification,
        notify,
        dismissNotification: () => setNotification(null),
        openAuth,
        openBooking,
        closeModal,
        signIn: startPreviewSession,
        signUp: startPreviewSession,
        signOut,
        toggleFavorite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
