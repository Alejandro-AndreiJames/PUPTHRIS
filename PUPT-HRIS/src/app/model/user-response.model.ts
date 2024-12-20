import { User } from './user.model';

export interface UserResponse {
  data: User[];
  metadata: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  }
}
