'use client'

import React from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  bucket: string;
  folder?: string;
  onUpload: (url: string) => void;
  currentImage?: string;
  className?: string;
  label?: string;
  maxSize?: string;
  recommendedSize?: string;
  allowedTypes?: string[];
  required?: boolean;
}

export function ImageUpload({
  bucket,
  folder = '',
  onUpload,
  currentImage,
  className = '',
  label = 'Upload Image',
  maxSize = "5MB",
  recommendedSize = "800x600",
  allowedTypes = ["JPG", "PNG", "WEBP"],
  required = false
}: ImageUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(currentImage || null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  const validateFile = (file: File): boolean => {
    try {
      // Check file size (max 5MB)
      const maxBytes = 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new Error(`File size must be less than ${maxSize}`);
      }

      // Check file type
      const fileType = file.type.toLowerCase();
      const validTypes = allowedTypes.map(type => {
        switch (type.toLowerCase()) {
          case 'jpg':
          case 'jpeg':
            return 'image/jpeg';
          case 'png':
            return 'image/png';
          case 'webp':
            return 'image/webp';
          case 'gif':
            return 'image/gif';
          default:
            return `image/${type.toLowerCase()}`;
        }
      });

      if (!validTypes.includes(fileType)) {
        throw new Error(`Please upload a valid image file (${allowedTypes.join(', ')})`);
      }

      return true;
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
      return false;
    }
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Please select an image to upload.');
      }

      const file = event.target.files[0];
      if (!validateFile(file)) {
        return;
      }

      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Generate unique filename with timestamp and random string
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${timestamp}-${randomString}.${fileExt}`;
      const filePath = folder ? `${folder}${fileName}` : fileName;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Upload failed - no data returned');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Error uploading image');
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    if (!preview || !window.confirm('Are you sure you want to remove this image?')) {
      return;
    }

    setPreview(null);
    onUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="text-xs text-gray-500">
          {`${recommendedSize} • Max ${maxSize} • ${allowedTypes.join(', ')}`}
        </div>
      </div>

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center">
            <button
              type="button"
              onClick={removeImage}
              className="p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors h-48 flex flex-col items-center justify-center ${
            uploading ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {uploading ? 'Uploading...' : 'Click to upload an image'}
          </p>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={uploadImage}
        accept={allowedTypes.map(type => `.${type.toLowerCase()}`).join(',')}
        className="hidden"
        disabled={uploading}
      />
    </div>
  );
}