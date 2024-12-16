export interface Education {
  EducationID?: number;
  UserID: number;
  Level: 'Bachelors Degree' | 'Post-Baccalaureate' | 'Masters' | 'Doctoral';
  NameOfSchool: string;
  Course?: string;  // for Bachelors only
  ThesisType?: 'Thesis' | 'Non-Thesis';  // for Masters and Doctoral
  MeansOfEducationSupport?: string;  // for Post-Baccalaureate, Masters, and Doctoral
  FundingAgency?: string;  // for Post-Baccalaureate, Masters, and Doctoral
  DurationOfFundingSupport?: string;  // for Post-Baccalaureate, Masters, and Doctoral
  UnitsEarned?: string;  // for Doctoral only
  YearGraduated: string;
}