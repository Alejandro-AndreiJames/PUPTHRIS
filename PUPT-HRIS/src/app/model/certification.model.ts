export interface Certification {
  CertificationID?: number;
  UserID: number;
  Name: string;
  IssuingOrganization: string;
  IssueDate?: Date;
  ExpirationDate?: Date;
  CredentialID?: string;
  CredentialURL?: string;
}
