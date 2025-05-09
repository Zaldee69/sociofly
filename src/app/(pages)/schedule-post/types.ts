export type FileWithPreview = {
  id: string;
  name: string;
  type: string;
  size: number;
  preview?: string;
  file?: File;
  isUploaded: boolean;
  isUploading: boolean;
  uploadProgress: number;
  url?: string;
  isSelected: boolean;
};
