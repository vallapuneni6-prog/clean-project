import React from 'react';
import { Notification } from '../hooks/useNotification';

interface NotificationContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

const notificationStyles = {
  success: 'bg-green-50 border-green-200 text-green-700',
  error: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
};

const notificationIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onClose,
}) => {
  return (
    <div className="fixed top-4 right-4 space-y-2 z-50 max-w-sm">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`border rounded-lg p-4 flex justify-between items-start gap-4 animate-in fade-in slide-in-from-right-4 ${
            notificationStyles[notification.type]
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg font-bold">{notificationIcons[notification.type]}</span>
            <p className="font-semibold text-sm">{notification.message}</p>
          </div>
          <button
            onClick={() => onClose(notification.id)}
            className="hover:opacity-70 text-lg"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
