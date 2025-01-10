export interface Book {
  BookID?: number;
  UserID: number;
  Title: string;
  Author: string;
  Description?: string;
  DocumentPath?: string;
  createdAt?: Date;
  updatedAt?: Date;
  ISBN?: string;
} 