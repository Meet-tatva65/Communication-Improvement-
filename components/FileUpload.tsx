import React, { useState, useCallback, useRef } from 'react';
import { UploadCloudIcon } from './icons';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const uniqueId = useRef(`audio-upload-${Math.random().toString(36).substring(2, 9)}`).current;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [disabled, onFileSelect]);

  return (
    <div className="w-full max-w-md">
      <label
        htmlFor={uniqueId}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex justify-center w-full h-64 px-4 transition bg-gray-800 border-2 ${isDragging ? 'border-indigo-400' : 'border-gray-600'} border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none`}
      >
        <span className="flex flex-col items-center justify-center space-x-2">
          <UploadCloudIcon className={`w-16 h-16 ${isDragging ? 'text-indigo-400' : 'text-gray-500'}`} />
          <span className="font-medium text-gray-400">
            Drop your audio file here, or{' '}
            <span className="text-indigo-400 underline">browse</span>
          </span>
          <span className="text-sm text-gray-500">Supports MP3, WAV, M4A, etc.</span>
        </span>
        <input
          id={uniqueId}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
      </label>
    </div>
  );
};
