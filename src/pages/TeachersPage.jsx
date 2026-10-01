import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import TeacherCard from '../components/TeacherCard';
import TeacherFilters from '../components/TeacherFilters';
import { useApp } from '../context/AppContext';
import { getTeachers } from '../services/teachers';
import '../styles/teachers.css';

const emptyOptions = { languages: [], levels: [], prices: [] };

export default function TeachersPage({ favoritesOnly = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { favoriteIds } = useApp();
  const [teachers, setTeachers] = useState([]);
  const [options, setOptions] = useState(emptyOptions);
  const [hasMore, setHasMore] = useState(false);
  const [resolvedQuery, setResolvedQuery] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const requestRef = useRef(null);
  const language = searchParams.get('language') || '';
  const level = searchParams.get('level') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const favoriteKey = favoritesOnly ? JSON.stringify(favoriteIds) : '';
  const queryKey = JSON.stringify([language, level, maxPrice, favoriteKey]);
  const loading = resolvedQuery !== queryKey;

  const loadTeachers = useCallback(
    (cursor = null) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      getTeachers({
        language,
        level,
        maxPrice,
        favoriteIds: favoriteKey ? JSON.parse(favoriteKey) : null,
        cursor,
        limit: 4,
        signal: controller.signal,
      })
        .then((result) => {
          if (controller.signal.aborted) return;

          setTeachers((previous) =>
            cursor === null
              ? result.teachers
              : [...previous, ...result.teachers],
          );
          setOptions(result.options);
          setHasMore(result.hasMore);
          setNextCursor(result.nextCursor);
          setError('');
        })
        .catch((loadError) => {
          if (!controller.signal.aborted && loadError.name !== 'AbortError') {
            if (cursor === null) {
              setTeachers([]);
              setNextCursor(null);
              setHasMore(false);
            }
            setError(
              'We could not load the teachers. Please check your connection and try again.',
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setResolvedQuery(queryKey);
            setLoadingMore(false);
          }
        });
    },
    [language, level, maxPrice, favoriteKey, queryKey],
  );

  useEffect(() => {
    loadTeachers();
    return () => requestRef.current?.abort();
  }, [loadTeachers]);

  const updateFilter = (key, value) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const resetFilters = () => setSearchParams({}, { replace: true });
  const retryTeachers = () => {
    setResolvedQuery(null);
    loadTeachers();
  };
  const loadMoreTeachers = () => {
    setLoadingMore(true);
    loadTeachers(nextCursor);
  };
  const emptyFavorites = favoritesOnly && favoriteIds.length === 0;

  return (
    <main id="main-content" className="teachers-page">
      <div className="container teachers-container">
        <h1 className={favoritesOnly ? 'favorites-heading' : 'sr-only'}>
          {favoritesOnly
            ? 'Your favorite teachers'
            : 'Find your language teacher'}
        </h1>
        {favoritesOnly && (
          <p className="favorites-intro">
            Great connections start here. Keep your favorite tutors close.
          </p>
        )}

        <TeacherFilters
          filters={{ language, level, maxPrice }}
          options={options}
          onChange={updateFilter}
          onReset={resetFilters}
        />

        <div className="sr-only" role="status" aria-live="polite">
          {loading
            ? 'Loading teachers'
            : `Showing ${teachers.length} ${teachers.length === 1 ? 'teacher' : 'teachers'}.`}
        </div>

        {loading ? (
          <div className="teacher-skeleton-list" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="teacher-skeleton" key={index}>
                <span className="teacher-skeleton-avatar" />
                <div className="teacher-skeleton-content">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ))}
          </div>
        ) : error && teachers.length === 0 ? (
          <div className="teacher-empty-state" role="alert">
            <h2>A little trouble connecting</h2>
            <p>{error}</p>
            <button
              className="button button-primary"
              type="button"
              onClick={retryTeachers}
            >
              Try again
            </button>
          </div>
        ) : teachers.length === 0 ? (
          <div className="teacher-empty-state">
            <span className="teacher-empty-icon">
              <Icon name={emptyFavorites ? 'heart' : 'search'} size={32} />
            </span>
            <h2>
              {emptyFavorites
                ? 'Find a teacher you connect with'
                : 'No teachers match just yet'}
            </h2>
            <p>
              {emptyFavorites
                ? 'Tap the heart on a teacher’s card to save them here for later.'
                : 'Try another language, level, or price to find your next teacher.'}
            </p>
            {emptyFavorites ? (
              <Link className="button button-primary" to="/teachers">
                Explore teachers
                <Icon name="arrow-right" size={18} />
              </Link>
            ) : (
              <button
                className="button button-primary"
                type="button"
                onClick={resetFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="teacher-list">
              {teachers.map((teacher) => (
                <TeacherCard
                  key={teacher.id}
                  teacher={teacher}
                  selectedLevel={level}
                />
              ))}
            </div>

            {error && (
              <p className="teacher-load-error" role="alert">
                {error}
              </p>
            )}

            {hasMore && (
              <div className="teacher-load-more-wrap">
                <button
                  className="button button-primary teacher-load-more"
                  type="button"
                  disabled={loadingMore}
                  onClick={loadMoreTeachers}
                >
                  {loadingMore ? 'Loading…' : error ? 'Try again' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
