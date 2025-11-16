

import React, { useState, useCallback } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onLoadDemo: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onLoadDemo }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl text-center">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`p-12 border-2 border-dashed rounded-xl transition-colors duration-300 ${isDragging ? 'border-accent bg-gray-700' : 'border-gray-600 bg-gray-800'}`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".txt,.log,.json"
          onChange={handleFileChange}
        />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <UploadIcon className="w-12 h-12 text-gray-400 mb-4"/>
            <p className="text-lg font-semibold text-gray-200">Drag & drop your file here</p>
            <p className="text-gray-400 mt-1">or click to browse</p>
            <p className="text-xs text-gray-500 mt-4">Supports .txt, .log, and .json network maps</p>
        </label>
      </div>
       <div className="mt-4">
        <button
          onClick={onLoadDemo}
          className="text-sm text-gray-400 hover:text-accent underline transition-colors"
        >
          Or load a demo network map
        </button>
      </div>
    </div>
  );
};

export default FileUpload;