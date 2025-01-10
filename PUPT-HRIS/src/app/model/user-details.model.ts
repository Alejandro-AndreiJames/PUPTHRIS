export interface UserDetails {
  UserID: number;
  Email: string;
  BasicDetails?: {
    FirstName: string;
    LastName: string;
  };
}
