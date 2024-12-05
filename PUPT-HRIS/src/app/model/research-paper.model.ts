export interface ResearchPaper {
  ResearchID?: number;
  UserID: number;
  Title: string;
  Authors: string;
  PublicationDate: Date;
  Publisher?: string;
  Abstract?: string;
  Keywords?: string;
  Status: string;
  DocumentPath?: string;
  createdAt?: Date;
  updatedAt?: Date;
} 