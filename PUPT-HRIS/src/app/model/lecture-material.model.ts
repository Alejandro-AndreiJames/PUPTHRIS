export interface LectureMaterial {
  LectureID?: number;
  UserID: number;
  Title: string;
  Subject: string;
  Description?: string;
  FileType?: string;
  FilePath?: string;
  UploadDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  ReferenceLink?: string;
} 