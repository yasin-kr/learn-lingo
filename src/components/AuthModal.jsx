import { useId, useState } from 'react';
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
const registrationSchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters.')
    .required('Name is required.'),
  ...sharedFields,
});

export default function AuthModal({ mode = 'login', onClose }) {
  const isRegistration = mode === 'register' || mode === 'registration';
  const titleId = useId();
  const formId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { signIn, signUp } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(isRegistration ? registrationSchema : loginSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = async (values) => {
    setSubmitError('');
    try {
      await (isRegistration ? signUp(values) : signIn(values));
      onClose();
    } catch (error) {
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
        onSubmit={handleSubmit(onSubmit)}
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
        {submitError && (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        )}
        <button
          type="submit"
          className="button button-primary modal-submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Please wait…'
            : isRegistration
              ? 'Sign Up'
              : 'Log In'}
        </button>
        <p className="preview-note">
          Preview mode. Use sample details; no account is created.
        </p>
      </form>
    </Modal>
  );
}
