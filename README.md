# LearnLingo

**English** | [Türkçe](README.tr.md)

A React application that helps language learners explore teachers and filter them by language, proficiency level, and hourly rate.

## Current status

The project is currently a frontend preview. Login and registration forms create a preview profile in the browser; they do not perform real authentication, and passwords are not stored. The trial lesson form displays a summary of the completed request without sending a booking.

Teachers are loaded from `public/data/teachers.json`, a copy of the supplied original dataset. Four cards appear initially. Each `Load more` action makes a new HTTP request for the file; filtering and pagination run in the browser. Firebase is not connected yet.

## Features

- Home, Teachers, and Favorites pages; Favorites requires a preview session.
- Filters for language, learner proficiency level, and maximum hourly rate.
- Expandable teacher cards with experience details and student reviews.
- Favorites saved in `localStorage` for each preview profile.
- Required field validation, password visibility controls, and a trial lesson form.
- Modals with keyboard focus management that close using the close button, backdrop, or Escape key.
- Responsive layouts for mobile, tablet, and desktop screens.
- A theme that cycles through yellow, green, blue, pink, and peach on each visit or reload, while staying consistent during navigation.
- Matching logos featuring the flags of Spain, Italy, Ukraine, the United Kingdom, and Germany.
- Homepage images using `srcset` to select `1x` files for standard displays and `2x` files for retina displays.

## Technologies

React, Vite, React Router, React Hook Form, Yup, and CSS. ESLint and Prettier handle code quality and formatting; Playwright provides browser tests.

## Local setup

A current Node.js LTS release and npm are required.

```sh
npm install
npm run dev
```

Open the local address shown in the terminal. The frontend preview does not require Firebase configuration or environment variables.

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

## Design and technical scope

The interface is based on the [LearnLingo Figma design](https://www.figma.com/file/dewf5jVviSTuWMMyU3d8Mc/?node-id=0-1). The technical specification covers three pages, registration and session management with Firebase Authentication, a teacher collection in Realtime Database loaded four cards at a time, persistent favorites, teacher filters, and validated modal forms.

## Next steps

The next phase includes connecting Firebase Authentication, importing teachers into Realtime Database, implementing database pagination, and configuring security rules. Production configuration and deployment will follow.

Storing bookings in the database or sending emails is not required by the current technical specification; these are optional additional features.

The production build is written to `dist`. The hosting service must route page requests to `index.html` for React Router. A Netlify redirects file is included; the project has not been deployed yet.
