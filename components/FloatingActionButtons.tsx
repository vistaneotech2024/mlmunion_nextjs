'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Building2, FileText, MessageSquare, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function FloatingActionButtons() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Hide on admin pages and auth pages
  const isAdminPage = pathname.startsWith('/admin');
  const isAuthPage = pathname.startsWith('/login') || 
                     pathname.startsWith('/signup') ||
                     pathname.startsWith('/forgot-password') ||
                     pathname.startsWith('/reset-password');
  
  // Hide on the create pages themselves
  const isCreatePage = pathname === '/companies/new' ||
                      pathname === '/blog/new' ||
                      pathname === '/classifieds/new';
  
  if (isAdminPage || isAuthPage || isCreatePage) {
    return null;
  }

  const handleClick = (path: string) => {
    if (!user) {
      const returnUrl = window.location.pathname + window.location.search;
      localStorage.setItem('returnUrl', returnUrl);
      window.location.href = '/login';
      return;
    }
    setIsOpen(false);
  };

  const actionButtons = [
    {
      path: '/companies/new',
      icon: Building2,
      bgColor: 'bg-purple-600',
      hoverColor: 'hover:bg-purple-700',
      title: 'Add Company',
      label: 'Add Company'
    },
    {
      path: '/blog/new',
      icon: FileText,
      bgColor: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      title: 'Post Blog',
      label: 'Post Blog'
    },
    {
      path: '/classifieds/new',
      icon: MessageSquare,
      bgColor: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-600',
      title: 'Post Classify',
      label: 'Post Classify'
    }
  ];

  return (
    <>
      {/* Desktop View - Always Visible */}
      <div className="hidden md:flex fixed right-4 bottom-20 z-50 flex-col space-y-3">
        {actionButtons.map((button, index) => {
          const Icon = button.icon;
          return (
      <Link
              key={button.path}
              href={button.path}
              onClick={() => handleClick(button.path)}
              className={`group relative ${button.bgColor} ${button.hoverColor} text-white p-3 rounded-full shadow-lg transition-colors`}
              title={button.title}
      >
              <Icon className="h-6 w-6" />
        <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                {button.label}
        </span>
      </Link>
          );
        })}
      </div>

      {/* Mobile View - FAB Menu */}
      <div className="md:hidden fixed right-4 bottom-20 z-50">
        {/* Action Buttons */}
        <div className={`flex flex-col-reverse space-y-reverse space-y-3 mb-3 transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}>
          {actionButtons.map((button, index) => {
            const Icon = button.icon;
            return (
      <Link
                key={button.path}
                href={button.path}
                onClick={() => handleClick(button.path)}
                className={`${button.bgColor} ${button.hoverColor} text-white p-4 rounded-full shadow-xl transition-all duration-300 transform hover:scale-110`}
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
                }}
                title={button.title}
              >
                <Icon className="h-6 w-6" />
      </Link>
            );
          })}
        </div>

        {/* Main Plus Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 transform ${
            isOpen ? 'rotate-45 scale-110' : 'rotate-0 scale-100'
          }`}
          aria-label="Toggle menu"
      >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </button>

        {/* Backdrop - Close menu when clicking outside */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/20 -z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
    </div>
    </>
  );
}

