export interface Book {
  BookID?: number;
  UserID: number;
  Title: string;
  Authors: string;
  PublicationDate: Date;
  Publisher: string;
  ISBN?: string;
  Description?: string;
  createdAt?: Date;
  updatedAt?: Date;
} 