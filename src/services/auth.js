export const authenticationUnavailableMessage =
  'Account services are currently unavailable. Please try again later.';

const authMessages = {
  'auth/invalid-credential':
    'The email or password is incorrect. Please try again.',
  'auth/invalid-login-credentials':
    'The email or password is incorrect. Please try again.',
  'auth/user-not-found':
    'The email or password is incorrect. Please try again.',
  'auth/wrong-password':
    'The email or password is incorrect. Please try again.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use':
    'This email is already registered. Please log in instead.',
  'auth/weak-password':
    'Choose a stronger password with at least 6 characters.',
  'auth/password-does-not-meet-requirements':
    'Choose a stronger password with uppercase and lowercase letters, a number, and a symbol.',
  'auth/too-many-requests':
    'Too many attempts. Please wait a few minutes before trying again.',
  'auth/network-request-failed':
    'We could not connect. Please check your connection and try again.',
  'auth/user-disabled': 'This account is unavailable. Please contact support.',
  'auth/operation-not-allowed': authenticationUnavailableMessage,
  'auth/invalid-api-key': authenticationUnavailableMessage,
  'auth/app-not-authorized': authenticationUnavailableMessage,
  'auth/unauthorized-domain': authenticationUnavailableMessage,
  'auth/configuration-not-found': authenticationUnavailableMessage,
  'auth/configuration-missing': authenticationUnavailableMessage,
};

export function getAuthErrorMessage(error) {
  return (
    authMessages[error?.code] ||
    'We could not complete this request. Please try again.'
  );
}
