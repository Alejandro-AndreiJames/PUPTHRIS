export interface AcademicRank {
  AcademicRankID?: number;
  UserID: number;
  Rank: string;
  UpdatedAt?: Date;
}

export interface AcademicRankCount {
  Rank: string;
  count: number;
}