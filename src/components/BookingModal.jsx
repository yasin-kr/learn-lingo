import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import Modal from './Modal';

const reasons = [
  'Career and business',
  'Lesson for kids',
  'Living abroad',
  'Exams and coursework',
  'Culture, travel or hobby',
];

const bookingSchema = yup.object({
  reason: yup
    .string()
    .oneOf(reasons, 'Choose a learning goal.')
    .required('Choose a learning goal.'),
  name: yup
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters.')
    .required('Full name is required.'),
  email: yup
    .string()
    .trim()
    .email('Enter a valid email address.')
    .required('Email is required.'),
  phone: yup
    .string()
    .trim()
    .required('Phone number is required.')
    .test(
      'phone-number',
      'Enter a valid phone number with 7–15 digits.',
      (value) => {
        if (!value) return true;
        const digits = value.replace(/\D/g, '');
        return (
          /^\+?[\d\s().-]+$/.test(value) &&
          digits.length >= 7 &&
          digits.length <= 15
        );
      },
    ),
});

export default function BookingModal({ teacher, onClose }) {
  const titleId = useId();
  const formId = useId();
  const [request, setRequest] = useState(null);
  const confirmationRef = useRef(null);
  const { user } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(bookingSchema),
    defaultValues: {
      name: user?.name || user?.displayName || '',
      email: user?.email || '',
      phone: '',
      reason: reasons[0],
    },
    mode: 'onTouched',
  });
  const teacherName = `${teacher.name} ${teacher.surname}`;

  useEffect(() => {
    if (request) confirmationRef.current?.focus();
  }, [request]);

  return (
    <Modal onClose={onClose} labelledBy={titleId} className="booking-modal">
      {request ? (
        <div className="booking-confirmation">
          <span className="confirmation-symbol">
            <Icon name="check" size={28} />
          </span>
          <h2
            ref={confirmationRef}
            id={titleId}
            className="modal-title"
            tabIndex={-1}
          >
            Your lesson request is ready
          </h2>
          <p className="modal-description">
            Thanks, {request.name}. You have completed the trial lesson form for{' '}
            {teacherName}.
          </p>
          <div className="request-summary">
            <span>Your learning goal</span>
            <strong>{request.reason}</strong>
          </div>
          <p className="preview-note confirmation-note">
            This preview does not send a booking. Lesson requests will be
            available after the service is connected.
          </p>
          <button
            type="button"
            className="button button-primary modal-submit"
            onClick={onClose}
          >
            Back to teachers
          </button>
        </div>
      ) : (
        <>
          <h2 id={titleId} className="modal-title">
            Book trial lesson
          </h2>
          <p className="modal-description">
            Our experienced tutor will assess your current language level,
            discuss your learning goals, and tailor the lesson to your specific
            needs.
          </p>
          <div className="booking-teacher">
            <img src={teacher.avatar_url} alt="" width="44" height="44" />
            <div>
              <span>Your teacher</span>
              <p>{teacherName}</p>
            </div>
          </div>
          <form
            className="modal-form booking-form"
            onSubmit={handleSubmit((values) => setRequest(values))}
            noValidate
          >
            <fieldset className="booking-reasons">
              <legend>
                What is your main reason for learning{' '}
                {teacher.languages?.[0] || 'a new language'}?
              </legend>
              <div className="reason-options">
                {reasons.map((reason) => (
                  <label className="reason-option" key={reason}>
                    <input
                      type="radio"
                      value={reason}
                      aria-invalid={Boolean(errors.reason)}
                      aria-describedby={
                        errors.reason ? `${formId}-reason-error` : undefined
                      }
                      {...register('reason')}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
              {errors.reason && (
                <p id={`${formId}-reason-error`} className="field-error">
                  {errors.reason.message}
                </p>
              )}
            </fieldset>
            <div className="form-fields">
              <div className="form-field">
                <label className="sr-only" htmlFor={`${formId}-name`}>
                  Full Name
                </label>
                <input
                  id={`${formId}-name`}
                  placeholder="Full Name"
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
                <label className="sr-only" htmlFor={`${formId}-phone`}>
                  Phone number
                </label>
                <input
                  id={`${formId}-phone`}
                  type="tel"
                  placeholder="Phone number"
                  autoComplete="tel"
                  aria-required="true"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={
                    errors.phone ? `${formId}-phone-error` : undefined
                  }
                  {...register('phone')}
                />
                {errors.phone && (
                  <p id={`${formId}-phone-error`} className="field-error">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>
            <button
              type="submit"
              className="button button-primary modal-submit"
            >
              Book
            </button>
            <p className="preview-note">
              Preview mode. This form does not send a booking.
            </p>
          </form>
        </>
      )}
    </Modal>
  );
}
