'use client'

import React from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface PointsNotificationProps {
  points: number;
  message?: string;
}

export function showPointsNotification(points: number, message?: string) {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 shadow-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 transform transition-all duration-500 ease-in-out`}
        style={{
          animation: t.visible
            ? 'slideInRight 0.5s ease-out, bounce 0.6s ease-out 0.5s'
            : 'slideOutRight 0.3s ease-in',
        }}
      >
        <div className="flex-1 w-0 p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="relative">
                <Trophy className="h-10 w-10 text-white animate-bounce" />
                <Sparkles className="h-5 w-5 text-yellow-200 absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '2s' }} />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🎉</span>
                <span>You got <span className="text-2xl font-extrabold">{points}</span> points!</span>
              </p>
              {message && (
                <p className="mt-2 text-sm text-yellow-100 font-medium">
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex border-l border-yellow-600">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent p-4 flex items-center justify-center text-sm font-medium text-white hover:text-yellow-200 hover:bg-yellow-600 focus:outline-none transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    ),
    {
      duration: 5000,
      position: 'top-right',
      style: {
        background: 'transparent',
        boxShadow: 'none',
        padding: 0,
      },
    }
  );
}

// CSS animations (add to your global CSS or use Tailwind config)
const styles = `
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  25% {
    transform: translateY(-8px) scale(1.02);
  }
  50% {
    transform: translateY(-12px) scale(1.05);
  }
  75% {
    transform: translateY(-8px) scale(1.02);
  }
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined') {
  const styleId = 'points-notification-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    document.head.appendChild(style);
  }
}

