export interface ProfessionalLicense {
  LicenseID?: number;
  UserID: number;
  ProfessionalLicenseEarned: string;
  YearObtained: number;
  ExpirationDate?: Date;
  AnnualSalary?: number;
  SalaryGradeStep?: string;
  RatePerHour?: number;
  DateOfLastPromotion?: Date;
  InitialYearOfTeaching?: number;
}
