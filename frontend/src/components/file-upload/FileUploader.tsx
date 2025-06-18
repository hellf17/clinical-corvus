"use client";
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
  onFileDrop?: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFileDrop, 
  accept = '*/*', 
  maxFiles = 1,
  disabled = false,
  className = ""
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (onFileDrop) {
      onFileDrop(acceptedFiles);
    }
  }, [onFileDrop]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: accept === '*/*' ? undefined : { [accept]: [] },
    maxFiles,
    disabled
  });

  return (
    <div 
      {...getRootProps()} 
      className={`file-uploader p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
        isDragActive 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <div className="text-blue-600">
          <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm font-medium">Solte os arquivos aqui...</p>
        </div>
      ) : (
        <div className="text-gray-600">
          <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
          </svg>
          <p className="text-sm font-medium">
            Arraste e solte arquivos aqui ou <span className="text-blue-600 underline">clique para selecionar</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {maxFiles === 1 ? 'Máximo 1 arquivo' : `Máximo ${maxFiles} arquivos`}
          </p>
        </div>
      )}
      
      {acceptedFiles.length > 0 && (
        <div className="mt-4 text-left">
          <p className="text-sm font-medium text-gray-700 mb-2">Arquivos selecionados:</p>
          <ul className="text-sm text-gray-600">
            {acceptedFiles.map((file, index) => (
              <li key={index} className="flex items-center space-x-2">
                <span>📄</span>
                <span>{file.name}</span>
                <span className="text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploader; 