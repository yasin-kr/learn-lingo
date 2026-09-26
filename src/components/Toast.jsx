import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

export default function Toast() {
  const { notification, dismissNotification } = useApp();
  useEffect(() => {
    if (!notification) return;
    const timeout = setTimeout(dismissNotification, 5500);
    return () => clearTimeout(timeout);
  }, [notification, dismissNotification]);
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {notification && (
        <div className="toast" key={notification.id}>
          <span>{notification.message}</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={dismissNotification}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
