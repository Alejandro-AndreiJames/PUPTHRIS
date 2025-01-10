import { User } from './user.model';

export interface Book {
  BookID?: number;
  Title: string;
  Author: string;
  Description?: string;
  ISBN?: string;
  DocumentPath?: string;
  UserID: number;
  User?: User;
  createdAt?: Date;
  updatedAt?: Date;
} 