import { useId, useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
}

export default function TeacherCard({ teacher, selectedLevel = '' }) {
  const [expanded, setExpanded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const detailsId = useId();
  const { favoriteIds, toggleFavorite, openBooking } = useApp();
  const name = `${teacher.name} ${teacher.surname}`;
  const isFavorite = favoriteIds.includes(teacher.id);
  const activeLevel = selectedLevel || teacher.levels[0];

  return (
    <article className="teacher-card" aria-label={`${name}, language tutor`}>
      <div className="teacher-avatar-wrap">
        {avatarError ? (
          <span className="teacher-avatar teacher-avatar-fallback">
            {initials(name)}
          </span>
        ) : (
          <img
            className="teacher-avatar"
            src={teacher.avatar_url}
            alt={name}
            width="96"
            height="96"
            loading="lazy"
            onError={() => setAvatarError(true)}
          />
        )}
        <span className="teacher-online-dot" aria-hidden="true" />
      </div>

      <div className="teacher-card-content">
        <div className="teacher-card-header">
          <div className="teacher-identity">
            <p className="teacher-category">Languages</p>
            <h2>{name}</h2>
          </div>

          <ul className="teacher-stats" aria-label="Teacher statistics">
            <li>
              <Icon name="book" size={16} />
              <span>Lessons online</span>
            </li>
            <li>
              <span>Lessons done: {teacher.lessons_done}</span>
            </li>
            <li>
              <Icon
                className="teacher-rating-star"
                name="star"
                size={16}
                fill="currentColor"
              />
              <span>Rating: {teacher.rating}</span>
            </li>
            <li>
              <span>
                Price / 1 hour:{' '}
                <strong className="teacher-price">
                  {teacher.price_per_hour}$
                </strong>
              </span>
            </li>
          </ul>

          <button
            className={`teacher-favorite${isFavorite ? ' is-favorite' : ''}`}
            type="button"
            aria-label={`${isFavorite ? 'Remove' : 'Add'} ${name} ${isFavorite ? 'from' : 'to'} favorites`}
            aria-pressed={isFavorite}
            onClick={() => toggleFavorite(teacher)}
          >
            <Icon
              name="heart"
              size={26}
              fill={isFavorite ? 'currentColor' : 'none'}
            />
          </button>
        </div>

        <div className="teacher-description">
          <p>
            <span className="teacher-detail-label">Speaks: </span>
            <span className="teacher-languages">
              {teacher.languages.join(', ')}
            </span>
          </p>
          <p>
            <span className="teacher-detail-label">Lesson Info: </span>
            {teacher.lesson_info}
          </p>
          <p>
            <span className="teacher-detail-label">Conditions: </span>
            {Array.isArray(teacher.conditions)
              ? teacher.conditions.join(' ')
              : teacher.conditions}
          </p>
        </div>

        <div id={detailsId} className="teacher-expanded" hidden={!expanded}>
          <p className="teacher-experience">{teacher.experience}</p>
          <ul
            className="teacher-reviews"
            aria-label={`Student reviews for ${name}`}
          >
            {teacher.reviews.map((review, index) => (
              <li
                className="teacher-review"
                key={`${review.reviewer_name}-${index}`}
              >
                <div className="teacher-review-author">
                  <span className="teacher-review-avatar" aria-hidden="true">
                    {initials(review.reviewer_name)}
                  </span>
                  <div>
                    <p className="teacher-review-name">
                      {review.reviewer_name}
                    </p>
                    <p className="teacher-review-rating">
                      <Icon
                        className="teacher-rating-star"
                        name="star"
                        size={16}
                        fill="currentColor"
                      />
                      <span>
                        {Number(review.reviewer_rating).toFixed(1)}
                        <span className="sr-only"> out of 5</span>
                      </span>
                    </p>
                  </div>
                </div>
                <p className="teacher-review-comment">{review.comment}</p>
              </li>
            ))}
          </ul>
        </div>

        <button
          className="teacher-read-more"
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((previous) => !previous)}
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>

        <ul className="teacher-levels" aria-label="Available learning levels">
          {teacher.levels.map((level) => (
            <li
              className={level === activeLevel ? 'is-active' : ''}
              key={level}
            >
              #{level}
            </li>
          ))}
        </ul>

        {expanded && (
          <button
            className="button button-primary teacher-book-button"
            type="button"
            onClick={() => openBooking(teacher)}
          >
            Book trial lesson
          </button>
        )}
      </div>
    </article>
  );
}
