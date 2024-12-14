export interface Book {
  BookID?: number;
  UserID: number;
  Title: string;
  Author: string;
  Description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  ISBN?: string;
} 