import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  content: string;
  type: string;
  file: File;
}

interface FileUploadAreaProps {
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

const FileUploadArea = ({ uploadedFiles, onFilesChange }: FileUploadAreaProps) => {
  const removeFile = (id: string) => {
    onFilesChange(uploadedFiles.filter(file => file.id !== id));
  };

  const clearAllFiles = () => {
    onFilesChange([]);
  };

  if (uploadedFiles.length === 0) return null;

  return (
    <Card className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium flex items-center">
          <FileText className="h-5 w-5 mr-2 text-cyan-400" />
          Uploaded Files ({uploadedFiles.length}/2)
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFiles}
          className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      </div>
      
      <div className="space-y-3">
        {uploadedFiles.map((file) => (
          <div 
            key={file.id} 
            className="flex items-center justify-between bg-slate-700/30 border border-slate-600/30 p-4 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-cyan-400" />
              <span className="text-white">{file.name}</span>
              <span className="text-xs text-slate-400 px-2 py-1 bg-slate-600/30 rounded">
                {file.type.toUpperCase()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFile(file.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default FileUploadArea;
