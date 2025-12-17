import React, { useState } from 'react';
import Button from '../../shared/Button';
import { supabase } from '../../../lib/supabase';

/**
 * Photo Upload Component
 * 
 * Features:
 * - Image preview
 * - Drag and drop support
 * - File validation (type, size)
 * - Upload to Supabase Storage
 * - Circular crop for profile photos
 */
const PhotoUpload = ({ 
  userId, 
  photoType, // 'profile' or 'vehicle'
  currentPhotoUrl, 
  onUploadSuccess,
  circular = false 
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentPhotoUrl);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a JPG or PNG image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadPhoto(file);
  };

  const uploadPhoto = async (file) => {
    if (!userId) {
      alert('User not authenticated');
      return;
    }

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${photoType}_${Date.now()}.${fileExt}`;
      const filePath = `${photoType}_photos/${fileName}`;

      // Upload to Supabase Storage (upload_photos bucket)
      const { data, error: uploadError } = await supabase.storage
        .from('upload_photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('upload_photos')
        .getPublicUrl(filePath);

      // Update driver profile with photo URL
      const updateField = photoType === 'profile'
        ? 'profile_photo_url'
        : photoType === 'vehicle'
        ? 'vehicle_photo_url'
        : 'license_photo_url';

      const { error: updateError } = await supabase
        .from('driver_profiles')
        .update({ [updateField]: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setPreview(publicUrl);
      if (onUploadSuccess) {
        onUploadSuccess(publicUrl);
      }
      alert('Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert(`Failed to upload photo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex justify-center">
        {preview ? (
          <div className={`relative ${circular ? 'w-32 h-32' : 'w-full h-48'}`}>
            <img
              src={preview}
              alt={`${photoType} photo`}
              className={`${circular ? 'w-32 h-32 rounded-full' : 'w-full h-48 rounded-lg'} object-cover border-4 border-slate-200`}
            />
            {!uploading && (
              <button
                onClick={() => setPreview(null)}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className={`${circular ? 'w-32 h-32 rounded-full' : 'w-full h-48 rounded-lg'} bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center`}>
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-1 text-sm text-slate-600">No photo uploaded</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          dragActive ? 'border-yellow-400 bg-yellow-50' : 'border-slate-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id={`${photoType}-upload`}
          accept="image/jpeg,image/png,image/jpg"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />
        <label
          htmlFor={`${photoType}-upload`}
          className="cursor-pointer"
        >
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              {dragActive ? 'Drop image here' : 'Drag and drop or click to upload'}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`${photoType}-upload`).click();
              }}
            >
              {uploading ? 'Uploading...' : 'Choose File'}
            </Button>
            <p className="text-xs text-slate-500">
              JPG or PNG, max 2MB
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default PhotoUpload;

