'use client'

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackLinkProps {
  to?: string;
  label?: string;
}

export function BackLink({ to, label }: BackLinkProps) {
  const router = useRouter();
  const handleClick = () => {
    if (to) {
      return; // Let the Link handle navigation
    }
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back(); // Go back if there's history
    } else {
      router.push('/'); // Go home if no history
    }
  };

  const content = (
    <div className="inline-flex items-center text-indigo-600 hover:text-indigo-700 group">
      <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
      {label || 'Back'}
    </div>
  );

  if (!to) {
    return (
      <button onClick={handleClick} className="mb-8">
        {content}
      </button>
    );
  }

  return (
    <Link href={to} className="inline-block mb-8">
      {content}
    </Link>
  );
}