export interface FacultyEvaluation {
  UserID: number;
  EvaluatorID: number;
  DateEvaluated: Date;
  AcademicYear: string;
  Semester: string;
  NumberOfRespondents: number;
  CourseYearSection: string;
  CriteriaRatings: {
    InstructionAndDiscussion: {
      score: number;
      weight: number;
      category: string;
    };
    Commitment: {
      score: number;
      weight: number;
      category: string;
    };
    TeachingIndependentLearning: {
      score: number;
      weight: number;
      category: string;
    };
    InstructionalMaterials: {
      score: number;
      weight: number;
      category: string;
    };
  };
  Status: 'Completed';
}

export interface EvaluationResult {
  score: number;
  scale: 1 | 2 | 3 | 4 | 5;
  description: 'Poor' | 'Fair' | 'Satisfactory' | 'Very Satisfactory' | 'Outstanding';
}

export function calculateRatingDescription(score: number): EvaluationResult {
  if (score >= 91 && score <= 100) {
    return { score, scale: 5, description: 'Outstanding' };
  } else if (score >= 71 && score < 91) {
    return { score, scale: 4, description: 'Very Satisfactory' };
  } else if (score >= 51 && score < 71) {
    return { score, scale: 3, description: 'Satisfactory' };
  } else if (score >= 31 && score < 51) {
    return { score, scale: 2, description: 'Fair' };
  } else {
    return { score, scale: 1, description: 'Poor' };
  }
}

export interface EvaluationSubmission {
  facultyId: number;
  evaluatorId: number;
  academicYear: string;
  semester: 'First Semester' | 'Second Semester';  // Match backend ENUM exactly
  courseSection: string;
  numberOfRespondents: number;
  totalScore: number;
  qualitativeRating: 'Poor' | 'Fair' | 'Satisfactory' | 'Very Satisfactory' | 'Outstanding';
  scores: Array<{
    CriteriaID: number;
    Score: number;
  }>;
  createdBy: number;
}

export interface EvaluationScore {
  CriteriaID: number;
  Score: number;
}