import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

export default function Header() {
  const { user, theme, openAuth, signOut } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={`site-header ${location.pathname !== '/' ? 'site-header-inner' : ''}`}
    >
      <div className="header-container">
        <Link
          to="/"
          reloadDocument
          className="brand"
          onClick={closeMenu}
          aria-label="LearnLingo home"
        >
          <svg
            className="brand-light"
            width="106"
            height="40"
            viewBox="0 0 106 40"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            {['tail', 'trail', 'beam', 'glow', 'tip'].map((part) => (
              <path
                key={part}
                className={`brand-light-${part}`}
                d="M7 28C2 18 29 7 58 7C86 7 102 12 99 19C95 28 64 34 37 33C19 33 9 32 7 28Z"
                pathLength="1000"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
          <img
            src={`/images/logo-${theme.id}.svg`}
            alt="LearnLingo"
            width="133"
            height="28"
          />
        </Link>
        <button
          type="button"
          className="menu-toggle icon-button"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="header-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name={menuOpen ? 'x' : 'menu'} size={24} />
        </button>
        <div
          id="header-navigation"
          className={`header-navigation ${menuOpen ? 'is-open' : ''}`}
        >
          <nav aria-label="Main navigation" className="main-nav">
            <NavLink to="/" end onClick={closeMenu}>
              Home
            </NavLink>
            <NavLink to="/teachers" onClick={closeMenu}>
              Teachers
            </NavLink>
            {user && (
              <NavLink to="/favorites" onClick={closeMenu}>
                Favorites
              </NavLink>
            )}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <span className="user-name" title={user.name}>
                  {user.name}
                </span>
                <button
                  type="button"
                  className="login-button"
                  onClick={() => {
                    signOut();
                    closeMenu();
                  }}
                >
                  <Icon name="logout" />
                  Log out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="login-button"
                  onClick={() => {
                    openAuth('login');
                    closeMenu();
                  }}
                >
                  <Icon name="login" />
                  Log in
                </button>
                <button
                  type="button"
                  className="button button-dark registration-button"
                  onClick={() => {
                    openAuth('register');
                    closeMenu();
                  }}
                >
                  Registration
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
