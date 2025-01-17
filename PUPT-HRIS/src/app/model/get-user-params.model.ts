export interface GetUsersParams {
  page: number;
  limit: number;
  campusId?: number;
  search?: string;
  employmentType?: string;
  role?: string;
  isActive?: string;
  sortDirection?: 'ASC' | 'DESC';
  departmentId?: string;
}