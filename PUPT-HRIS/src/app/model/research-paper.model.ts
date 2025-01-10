import { User } from './user.model';

export interface ResearchPaper {
  ResearchID: number;
  Title: string;
  Description?: string;
  Authors: string;
  PublicationDate: Date;
  ReferenceLink?: string;
  DocumentPath?: string;
  UserID: number;
  User?: User;
}