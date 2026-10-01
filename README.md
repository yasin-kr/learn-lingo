# LearnLingo

**English** | [Türkçe](README.tr.md)

A React application that helps language learners explore teachers and filter them by language, proficiency level, and hourly rate.

[Live site](https://verdant-cajeta-d66ca6.netlify.app/) | [GitHub repository](https://github.com/yasin-kr/learn-lingo)

## Current status

The application is published on Netlify with Firebase Authentication and Realtime Database integration. Registration, login, logout, and persistent sessions use the Firebase JavaScript SDK; an authentication observer keeps the current user in sync. The application does not store passwords.

Teachers are loaded from Realtime Database through REST queries with key-based pagination. Four cards appear initially, and each `Load more` action makes a new database request. Combined filters are applied in the browser to bounded database batches; additional batches are requested as needed to find matching teachers. Filter options in `src/lib/teacher-options.json` match the supplied teacher dataset.

The trial lesson form displays a local summary of the completed request. It does not submit a booking or send an email.

## Features

- Home, Teachers, and Favorites pages; Favorites requires a Firebase session.
- Filters for language, learner proficiency level, and maximum hourly rate.
- Expandable teacher cards with experience details and student reviews.
- Favorites saved in `localStorage` under each Firebase user's UID. They persist in the same browser and do not sync across devices.
- Required field validation, password visibility controls, and a trial lesson form.
- Modals with keyboard focus management that close using the close button, backdrop, or Escape key.
- Responsive layouts for mobile, tablet, and desktop screens.
- A theme that cycles through yellow, green, blue, pink, and peach on each visit or reload. Regular navigation preserves the theme; clicking the LearnLingo logo reloads the home page and advances to the next theme.
- Matching logos featuring the flags of Spain, Italy, Ukraine, the United Kingdom, and Germany.
- Homepage images using `srcset` to select `1x` files for standard displays and `2x` files for retina displays.

## Technologies

React, Vite, React Router, Firebase Authentication, Firebase Realtime Database, React Hook Form, Yup, and CSS. ESLint and Prettier handle code quality and formatting; Playwright provides browser tests.

## Local setup

A current Node.js LTS release and npm are required.

Copy `.env.example` to `.env.local` and fill in the Firebase web application configuration, including the Realtime Database URL. Keep `.env.local` out of Git. The expected variables are:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Complete the Firebase setup below, then run:

```sh
npm install
npm run dev
```

Open the local address shown in the terminal. Restart the development server after changing environment variables.

## Firebase setup

1. Create a Firebase project and register a web application.
2. Enable the Email/Password provider in Authentication. Add the local development and production hostnames to Authentication's authorized domains as needed.
3. Create a Realtime Database and use its URL for `VITE_FIREBASE_DATABASE_URL`.
4. Import `firebase/teachers.import.json` at the root of an empty database. It contains a `teachers` collection with 30 records keyed from `teacher-001` to `teacher-030`. Root imports replace existing data, so do not import over a populated database without preserving its contents.
5. Publish the rules from `firebase/database.rules.json`. They allow public reads of `teachers` and deny all client writes; other database paths cannot be read by clients.

Teacher data is maintained through administrative access, such as the Firebase Console. A `users` database collection is not required: Authentication manages accounts, and favorites remain in browser storage, separated by Firebase UID.

Use only the Firebase web application configuration in the frontend. Never put a service account private key or other server credentials in `VITE_` variables or project files.

## Checks

```sh
npm run build
npm run preview
npm run lint
npm run format:check
```

To run browser tests:

```sh
npx playwright install chromium
npm test
```

All 17 automated browser tests pass. They mock Firebase network responses in isolated browser contexts and do not create real accounts or modify the live database. Lint and production build checks also pass.

Checks on the published Netlify site against live Firebase verified registration and profile information, login and logout, persistent sessions, user-specific favorites, teacher pagination, and combined filters. Direct page links and reloads, protected Favorites access, form validation and modal dismissal, and mobile and tablet layouts were also checked. No browser console errors were detected, and the temporary test account was deleted after verification.

## Design and technical scope

The interface is based on the [LearnLingo Figma design](https://www.figma.com/file/dewf5jVviSTuWMMyU3d8Mc/?node-id=0-1). The technical specification covers three pages, registration and session management with Firebase Authentication, a teacher collection in Realtime Database loaded four cards at a time, persistent favorites, teacher filters, and validated modal forms.

## Deployment

The live application is available at [verdant-cajeta-d66ca6.netlify.app](https://verdant-cajeta-d66ca6.netlify.app/). Netlify deploys the `main` branch of the [GitHub repository](https://github.com/yasin-kr/learn-lingo).

For Netlify, use the repository root as the base directory, `npm run build` as the build command, and `dist` as the publish directory. Set the seven `VITE_FIREBASE_*` environment variables listed above in the hosting settings before building. Environment changes require a new build.

The production build is written to `dist`. The included `public/_redirects` file routes page requests to `index.html` for React Router, allowing direct links and reloads on `/teachers` and `/favorites`.

Storing bookings in the database or sending emails is not required by the current technical specification; these are optional additional features.
