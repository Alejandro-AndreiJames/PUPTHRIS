export interface GetUsersParams {
  page: number;
  limit: number;
  campusId: number;
  role: string;
  departmentId?: string;
  employmentType?: string;
  search?: string;
}