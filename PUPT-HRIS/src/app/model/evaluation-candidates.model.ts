// Define shared interfaces
export interface FacultyInfo {
  Faculty: {
    FirstName: string;
    MiddleName: string;
    Surname: string;
    Department: {
      DepartmentName: string;
    };
    EmploymentType: string;
    Position: string;
  };
}

export interface EvaluationRecord {
  academicYear: string;
  semester: string;
  score: number;
  rating: string;
}

// Regularization candidate model
export interface RegularizationCandidate {
  faculty: FacultyInfo;
  evaluations: EvaluationRecord[];
  averageScore: number;
  recommendationStrength: 'Strong' | 'Moderate' | 'Weak';
  eligibilityStatus: {
    isEligible: boolean;
    reason?: string;
  };
  qualitativeRating?: string;
}

// Performance review candidate model
export interface PerformanceReviewCandidate {
  faculty: FacultyInfo;
  evaluations: EvaluationRecord[];
  performanceMetrics: {
    trend: 'Improving' | 'Declining' | 'Stable';
    concernLevel: 'High' | 'Moderate' | 'Low';
    lowestScore: number;
    averageScore: number;
  };
  reviewStatus?: {
    needsImmediate: boolean;
    lastReviewDate?: Date;
  };
}

// Helper type for filtering and sorting
export type CandidateFilterCriteria = {
  department?: string;
  academicRank?: string;
  minScore?: number;
  maxScore?: number;
  recommendationStrength?: 'Strong' | 'Moderate';
  concernLevel?: 'High' | 'Moderate' | 'Low';
};

// Helper type for sorting options
export type CandidateSortOption = 
  | 'name'
  | 'department'
  | 'averageScore'
  | 'recommendationStrength'
  | 'concernLevel';