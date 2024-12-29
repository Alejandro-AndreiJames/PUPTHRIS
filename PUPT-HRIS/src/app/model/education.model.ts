export interface Education {
  EducationID?: number;
  UserID: number;
  Level: 'Bachelors Degree' | 'Post-Baccalaureate' | 'Masters' | 'Doctoral';
  NameOfSchool: string;
  Course?: string;
  ThesisType?: 'Thesis' | 'Non-Thesis';
  MeansOfEducationSupport?: string | string[];
  FundingAgency?: string;
  DurationOfFundingSupport?: string;
  UnitsEarned?: string;
  YearGraduated: string;
}