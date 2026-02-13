import React from 'react';
import { HelpCircle } from 'lucide-react';

interface InputGuidelinesProps {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternText?: string;
  example?: string;
  additionalInfo?: string[];
}

export function InputGuidelines({ 
  minLength,
  maxLength,
  pattern,
  patternText,
  example,
  additionalInfo = []
}: InputGuidelinesProps) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600"
        aria-label="Input guidelines"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
      <div className="invisible group-hover:visible absolute bottom-full right-0 mb-2 w-64 p-4 bg-white rounded-lg shadow-lg border border-gray-200 text-sm text-gray-600 z-10">
        <h4 className="font-medium text-gray-900 mb-2">Input Guidelines</h4>
        <ul className="space-y-1">
          {minLength && <li>• Minimum length: {minLength} characters</li>}
          {maxLength && <li>• Maximum length: {maxLength} characters</li>}
          {pattern && patternText && <li>• Format: {patternText}</li>}
          {example && <li>• Example: {example}</li>}
          {additionalInfo.map((info, index) => (
            <li key={index}>• {info}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}