'use client'

import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const modules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean']
  ]
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet',
  'link', 'image'
];

export function RichTextEditor({ value, onChange, className = '' }: RichTextEditorProps) {
  // Use a ref to store the editor instance
  const editorRef = React.useRef<ReactQuill>(null);
  
  // Use state to track when the editor is ready
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    // Set ready state after a short delay to ensure proper initialization
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <div className="h-48 bg-gray-50 animate-pulse rounded-md" />;
  }

  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill
        ref={editorRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        className="h-full"
        preserveWhitespace
      />
    </div>
  );
}