import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const statistics = [
  ['32,000', 'Experienced', 'tutors'],
  ['300,000', '5-star tutor', 'reviews'],
  ['120', 'Subjects', 'taught'],
  ['200', 'Tutor', 'nationalities'],
];

export default function HomePage() {
  const { theme } = useApp();
  return (
    <main id="main-content" className="home-page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">
            Unlock your potential with the best <em>language</em> tutors
          </h1>
          <p>
            Embark on an Exciting Language Journey with Expert Language Tutors:
            Elevate your language proficiency to new heights by connecting with
            highly qualified and experienced tutors.
          </p>
          <Link to="/teachers" className="button button-primary hero-button">
            Get started
          </Link>
        </div>
        <div className="hero-art">
          <img
            src={`/images/hero-${theme.id}.png`}
            srcSet={`/images/hero-${theme.id}.png 1x, /images/hero-${theme.id}@2x.png 2x`}
            alt="A friendly language tutor ready to meet you online"
            width="568"
            height="530"
            fetchPriority="high"
          />
        </div>
      </section>
      <section className="statistics" aria-label="LearnLingo in numbers">
        <svg className="statistics-border" aria-hidden="true" focusable="false">
          <rect
            x="1"
            y="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="12 16"
          />
        </svg>
        <dl>
          {statistics.map(([value, line1, line2]) => (
            <div className="statistic" key={value}>
              <dt>
                {line1}
                <br />
                {line2}
              </dt>
              <dd>
                {value}
                <span> +</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
