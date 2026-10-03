import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import Modal from './Modal';

const sharedFields = {
  email: yup
    .string()
    .trim()
    .email('Enter a valid email address.')
    .required('Email is required.'),
  password: yup
    .string()
    .min(6, 'Use at least 6 characters.')
    .required('Password is required.'),
};

const loginSchema = yup.object(sharedFields);
const resetSchema = yup.object({ email: sharedFields.email });
const registrationSchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters.')
    .required('Name is required.'),
  ...sharedFields,
});

function AccountAuthModal({ mode = 'login', onClose }) {
  const isRegistration = mode === 'register' || mode === 'registration';
  const titleId = useId();
  const formId = useId();
  const activeRef = useRef(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { signIn, signUp, openAuth, authLoading, authError } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(isRegistration ? registrationSchema : loginSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onTouched',
  });

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const onSubmit = async (values) => {
    setSubmitError('');
    try {
      await (isRegistration ? signUp(values) : signIn(values));
      if (activeRef.current) onClose();
    } catch (error) {
      if (!activeRef.current) return;
      setSubmitError(
        error?.message || 'We could not continue. Please try again.',
      );
    }
  };

  return (
    <Modal onClose={onClose} labelledBy={titleId} className="auth-modal">
      <h2 id={titleId} className="modal-title">
        {isRegistration ? 'Registration' : 'Log In'}
      </h2>
      <p className="modal-description">
        {isRegistration
          ? 'Thank you for your interest in our platform! In order to register, we need some information. Please provide us with the following information'
          : 'Welcome back! Please enter your credentials to access your account and continue your search for a teacher.'}
      </p>
      <form
        className="modal-form auth-form"
        onSubmit={(event) => handleSubmit(onSubmit)(event)}
        noValidate
      >
        <div className="form-fields">
          {isRegistration && (
            <div className="form-field">
              <label className="sr-only" htmlFor={`${formId}-name`}>
                Name
              </label>
              <input
                id={`${formId}-name`}
                placeholder="Name"
                autoComplete="name"
                aria-required="true"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={
                  errors.name ? `${formId}-name-error` : undefined
                }
                {...register('name')}
              />
              {errors.name && (
                <p id={`${formId}-name-error`} className="field-error">
                  {errors.name.message}
                </p>
              )}
            </div>
          )}
          <div className="form-field">
            <label className="sr-only" htmlFor={`${formId}-email`}>
              Email
            </label>
            <input
              id={`${formId}-email`}
              type="email"
              placeholder="Email"
              autoComplete="email"
              aria-required="true"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? `${formId}-email-error` : undefined
              }
              {...register('email')}
            />
            {errors.email && (
              <p id={`${formId}-email-error`} className="field-error">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="form-field">
            <label className="sr-only" htmlFor={`${formId}-password`}>
              Password
            </label>
            <div className="password-field">
              <input
                id={`${formId}-password`}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                autoComplete={
                  isRegistration ? 'new-password' : 'current-password'
                }
                aria-required="true"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? `${formId}-password-error` : undefined
                }
                {...register('password')}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <Icon name={showPassword ? 'eye' : 'eye-off'} size={20} />
              </button>
            </div>
            {errors.password && (
              <p id={`${formId}-password-error`} className="field-error">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>
        {!isRegistration && (
          <button
            type="button"
            className="auth-text-button forgot-password"
            onClick={() => openAuth('reset')}
            disabled={isSubmitting}
          >
            Forgot password?
          </button>
        )}
        {(submitError || authError) && (
          <p className="form-error" role="alert">
            {submitError || authError}
          </p>
        )}
        <button
          type="submit"
          className="button button-primary modal-submit"
          disabled={isSubmitting || authLoading || Boolean(authError)}
        >
          {isSubmitting
            ? 'Please wait…'
            : isRegistration
              ? 'Sign Up'
              : 'Log In'}
        </button>
      </form>
    </Modal>
  );
}

function PasswordResetModal({ onClose }) {
  const titleId = useId();
  const formId = useId();
  const activeRef = useRef(true);
  const submittingRef = useRef(false);
  const successHeadingRef = useRef(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { resetPassword, openAuth, authLoading, authError } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(resetSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });
  const isPending = isSubmitting || isSending;

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (submitted) successHeadingRef.current?.focus();
  }, [submitted]);

  const onSubmit = async (values) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSending(true);
    setSubmitError('');
    try {
      await resetPassword(values);
      if (activeRef.current) setSubmitted(true);
    } catch (error) {
      if (activeRef.current) {
        setSubmitError(
          error?.message || 'We could not continue. Please try again.',
        );
      }
    } finally {
      submittingRef.current = false;
      if (activeRef.current) setIsSending(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy={titleId} className="auth-modal">
      <h2
        id={titleId}
        ref={successHeadingRef}
        className="modal-title"
        tabIndex={submitted ? -1 : undefined}
      >
        {submitted ? 'Check your email' : 'Reset password'}
      </h2>
      {submitted ? (
        <p className="modal-description" role="status">
          If an account exists for this email address, you will receive a
          password reset link.
        </p>
      ) : (
        <>
          <p className="modal-description">
            Enter your account email address to request a password reset link.
          </p>
          <form
            className="modal-form auth-form"
            onSubmit={(event) => handleSubmit(onSubmit)(event)}
            aria-busy={isPending}
            noValidate
          >
            <div className="form-field">
              <label className="sr-only" htmlFor={`${formId}-email`}>
                Email
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                placeholder="Email"
                autoComplete="email"
                aria-required="true"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email ? `${formId}-email-error` : undefined
                }
                readOnly={isPending}
                {...register('email')}
              />
              {errors.email && (
                <p id={`${formId}-email-error`} className="field-error">
                  {errors.email.message}
                </p>
              )}
            </div>
            {(submitError || authError) && (
              <p className="form-error" role="alert">
                {submitError || authError}
              </p>
            )}
            <button
              type="submit"
              className="button button-primary modal-submit"
              disabled={isPending || authLoading || Boolean(authError)}
            >
              {isPending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </>
      )}
      <button
        type="button"
        className="auth-text-button auth-back-button"
        onClick={() => openAuth('login')}
        disabled={isPending}
      >
        Back to log in
      </button>
    </Modal>
  );
}

export default function AuthModal(props) {
  return props.mode === 'reset' ? (
    <PasswordResetModal onClose={props.onClose} />
  ) : (
    <AccountAuthModal {...props} />
  );
}
