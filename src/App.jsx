import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import TeachersPage from './pages/TeachersPage';
import Modal from './components/Modal';
import AuthModal from './components/AuthModal';
import BookingModal from './components/BookingModal';
import Toast from './components/Toast';
import Icon from './components/Icon';

function FavoritesRoute() {
  const { user, authLoading, openAuth } = useApp();
  if (authLoading) {
    return (
      <main id="main-content" className="message-page" aria-busy="true">
        <p role="status">Loading your session…</p>
      </main>
    );
  }
  if (user) return <TeachersPage favoritesOnly />;
  return (
    <main id="main-content" className="message-page">
      <div className="message-icon">
        <Icon name="heart" size={32} />
      </div>
      <h1>Your favorite tutors, all together</h1>
      <p>
        Log in to save the teachers you love and pick up where you left off.
      </p>
      <button
        type="button"
        className="button button-primary"
        onClick={() => openAuth('login')}
      >
        Log in
      </button>
      <Link to="/teachers" className="text-link">
        Explore teachers
      </Link>
    </main>
  );
}

function PageNavigation() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const titles = {
      '/': 'Find your language tutor',
      '/teachers': 'Our teachers',
      '/favorites': 'Your favorites',
    };
    document.title = `LearnLingo — ${titles[pathname] || 'Page not found'}`;
  }, [pathname]);
  return null;
}

export default function App() {
  const { modal, closeModal, openAuth } = useApp();
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <PageNavigation />
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/teachers" element={<TeachersPage key="teachers" />} />
        <Route path="/favorites" element={<FavoritesRoute />} />
        <Route
          path="*"
          element={
            <main id="main-content" className="message-page">
              <h1>Let’s get you back on track.</h1>
              <p>The page you’re looking for isn’t here.</p>
              <Link to="/" className="button button-primary">
                Back to home
              </Link>
            </main>
          }
        />
      </Routes>
      {modal?.type === 'auth' && (
        <AuthModal key={modal.mode} mode={modal.mode} onClose={closeModal} />
      )}
      {modal?.type === 'booking' && (
        <BookingModal teacher={modal.teacher} onClose={closeModal} />
      )}
      {modal?.type === 'favorite-access' && (
        <Modal onClose={closeModal} labelledBy="favorite-access-title">
          <div className="access-modal">
            <div className="message-icon">
              <Icon name="heart" size={28} />
            </div>
            <h2 id="favorite-access-title">Keep your favorites close</h2>
            <p>
              Log in or create an account to save your favorite teachers and
              find them here whenever you need them.
            </p>
            <button
              type="button"
              className="button button-primary"
              onClick={() => openAuth('login')}
            >
              Log in
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => openAuth('register')}
            >
              Create an account
            </button>
          </div>
        </Modal>
      )}
      <Toast />
    </>
  );
}
