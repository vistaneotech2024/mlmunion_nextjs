import React from 'react';
import { HelpCircle } from 'lucide-react';

interface ImageGuidelinesProps {
  maxSize?: string;
  recommendedSize?: string;
  allowedTypes?: string[];
}

export function ImageGuidelines({ 
  maxSize = "2MB", 
  recommendedSize = "800x600", 
  allowedTypes = ["JPG", "PNG", "GIF"]
}: ImageGuidelinesProps) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600"
        aria-label="Image guidelines"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
      <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-64 p-4 bg-white rounded-lg shadow-lg border border-gray-200 text-sm text-gray-600 z-10">
        <h4 className="font-medium text-gray-900 mb-2">Image Guidelines</h4>
        <ul className="space-y-1">
          <li>• Max file size: {maxSize}</li>
          <li>• Recommended size: {recommendedSize}</li>
          <li>• Allowed types: {allowedTypes.join(", ")}</li>
        </ul>
      </div>
    </div>
  );
}