'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';

interface VerifyEmailContentProps {
  email?: string;
}

export function VerifyEmailContent({ email }: VerifyEmailContentProps) {
  const displayEmail = email && typeof email === 'string' ? email.trim() : '';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-indigo-100 p-4">
            <Mail className="h-12 w-12 text-indigo-600" aria-hidden="true" />
          </div>
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          Check your email
        </h1>
        <p className="mt-3 text-center text-gray-600">
          We&apos;ve sent a confirmation link to
          {displayEmail ? (
            <span className="font-medium text-gray-900"> {displayEmail}</span>
          ) : (
            ' your email address'
          )}
          . Click the link in that email to verify your account and sign in.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <p className="text-sm text-gray-500 text-center">
            Didn&apos;t receive the email? Check your spam folder or try signing up again.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="flex w-full justify-center items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
          <p className="mt-4 text-center text-sm text-gray-500">
            <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              Create a new account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
