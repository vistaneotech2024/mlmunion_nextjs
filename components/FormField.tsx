import React from 'react';
import { InputGuidelines } from './InputGuidelines';

interface FormFieldProps {
  label: string;
  error?: string;
  guidelines?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    patternText?: string;
    example?: string;
    additionalInfo?: string[];
  };
  children: React.ReactNode;
}

export function FormField({ label, error, guidelines, children }: FormFieldProps) {
  return (
    <div>
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {guidelines && <InputGuidelines {...guidelines} />}
      </div>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}