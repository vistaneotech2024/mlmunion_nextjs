'use client'

import React from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Cropper, { Area } from 'react-easy-crop';

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
  enableCrop?: boolean;
  cropWidth?: number;
  cropHeight?: number;
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
  required = false,
  enableCrop = false,
  cropWidth = 1200,
  cropHeight = 630,
}: ImageUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(currentImage || null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [cropOpen, setCropOpen] = React.useState(false);
  const [cropImageSrc, setCropImageSrc] = React.useState<string | null>(null);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null);

  React.useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  React.useEffect(() => {
    return () => {
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    };
  }, [cropImageSrc]);

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

  async function createImageFromUrl(url: string): Promise<HTMLImageElement> {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', (e) => reject(e));
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }

  async function getCroppedFile(
    imageSrc: string,
    cropPixels: Area,
    output: { width: number; height: number },
    outputType: string,
    originalName: string
  ): Promise<File> {
    const image = await createImageFromUrl(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = output.width;
    canvas.height = output.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not prepare image editor');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw the cropped region (from source pixels) scaled to the target size.
    ctx.drawImage(
      image,
      cropPixels.x,
      cropPixels.y,
      cropPixels.width,
      cropPixels.height,
      0,
      0,
      output.width,
      output.height
    );

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to export cropped image'))),
        outputType,
        0.92
      );
    });

    const ext =
      outputType === 'image/png' ? 'png' :
      outputType === 'image/webp' ? 'webp' :
      'jpg';
    const safeBase = (originalName || 'image').replace(/\.[^/.]+$/, '');
    return new File([blob], `${safeBase}-cropped.${ext}`, { type: outputType });
  }

  async function uploadToSupabase(file: File) {
    // Generate unique filename with timestamp and random string
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${timestamp}-${randomString}.${fileExt}`;
    const filePath = folder ? `${folder}${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) throw error;
    if (!data) throw new Error('Upload failed - no data returned');

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
    onUpload(publicUrl);
    toast.success('Image uploaded successfully!');
  }

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Please select an image to upload.');
      }

      const file = event.target.files[0];
      if (!validateFile(file)) {
        return;
      }

      if (enableCrop) {
        if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
        const objectUrl = URL.createObjectURL(file);
        setPendingFile(file);
        setCropImageSrc(objectUrl);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setCropOpen(true);
        return;
      }

      setUploading(true);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      await uploadToSupabase(file);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Error uploading image');
      setPreview(currentImage || null);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onCropComplete = React.useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const cancelCrop = () => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
    setPendingFile(null);
    setCropOpen(false);
    setCroppedAreaPixels(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmCropAndUpload = async () => {
    if (!cropImageSrc || !pendingFile || !croppedAreaPixels) {
      toast.error('Please adjust the crop area');
      return;
    }
    try {
      setUploading(true);
      const outputType =
        pendingFile.type === 'image/png'
          ? 'image/png'
          : pendingFile.type === 'image/webp'
            ? 'image/webp'
            : 'image/jpeg';

      const croppedFile = await getCroppedFile(
        cropImageSrc,
        croppedAreaPixels,
        { width: cropWidth, height: cropHeight },
        outputType,
        pendingFile.name
      );

      const objectUrl = URL.createObjectURL(croppedFile);
      setPreview(objectUrl);
      await uploadToSupabase(croppedFile);

      setCropOpen(false);
      setPendingFile(null);
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
      setCroppedAreaPixels(null);
    } catch (error: any) {
      console.error('Crop/upload error:', error);
      toast.error(error.message || 'Error uploading image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      {enableCrop && (
        <div className="text-xs text-gray-500">
          Note: We only accept image dimension <span className="font-semibold text-gray-700">{cropWidth} × {cropHeight}</span>. You can crop/resize here before upload.
        </div>
      )}

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

      {cropOpen && cropImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelCrop} />
          <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Crop cover image</div>
                <div className="text-xs text-gray-500">Output: {cropWidth} × {cropHeight}</div>
              </div>
              <button type="button" onClick={cancelCrop} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative w-full h-[420px] bg-gray-900">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={cropWidth / cropHeight}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="horizontal-cover"
              />
            </div>

            <div className="px-4 py-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="text-xs text-gray-600 w-12">Zoom</div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelCrop}
                  disabled={uploading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmCropAndUpload}
                  disabled={uploading}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : 'Crop & Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}