import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const databaseURL = firebaseConfig.databaseURL?.replace(/\/$/, '') || '';

const requiredFields = [
  'apiKey',
  'authDomain',
  'databaseURL',
  'projectId',
  'appId',
];
let auth = null;
let firebaseConfigurationError = '';

try {
  if (requiredFields.some((field) => !firebaseConfig[field]?.trim())) {
    throw new Error('Missing Firebase configuration.');
  }
  if (new URL(databaseURL).protocol !== 'https:') {
    throw new Error('Invalid database URL.');
  }
  auth = getAuth(initializeApp(firebaseConfig));
} catch {
  firebaseConfigurationError =
    'The service is temporarily unavailable. Please try again later.';
}

export { auth, firebaseConfigurationError };
