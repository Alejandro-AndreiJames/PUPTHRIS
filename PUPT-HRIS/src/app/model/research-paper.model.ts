export interface ResearchPaper {
  ResearchID?: number;
  UserID: number;
  Title: string;
  Description?: string;
  Authors: string;
  PublicationDate: Date | string;
  ReferenceLink?: string;
  DocumentPath?: string;
  createdAt?: Date;
  updatedAt?: Date;
}