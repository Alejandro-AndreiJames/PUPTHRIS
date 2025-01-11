export interface EvaluationCriteria {
  CriteriaID: number;
  CriteriaName: string;
  Description: string;
  Weight: number;
  Category: string;
}

export interface EvaluationCategory {
  id: string;
  name: string;
  description: string;
  criteriaId: number;
  weight: number;
}

export const EVALUATION_CATEGORIES: EvaluationCategory[] = [
  {
    id: 'InstructionAndDiscussion',
    name: 'Instruction and Discussion Facilitation',
    description: 'Instruction and discussion facilitation refer to sharing control and direction with students.',
    criteriaId: 1,
    weight: 14.29
  },
  {
    id: 'Commitment',
    name: 'Commitment',
    description: 'Commitment refers to the course specialist act or quality of fulfilling responsibility.',
    criteriaId: 2,
    weight: 14.29
  },
  {
    id: 'TeachingIndependentLearning',
    name: 'Teaching for Independent Learning',
    description: 'Teaching for independent learning pertains to the course specialist\'s ability to organize teaching-learning process.',
    criteriaId: 3,
    weight: 14.29
  },
  {
    id: 'InstructionalMaterials',
    name: 'Use of Instructional Materials',
    description: 'Use of instructional materials and other educational resources to help maximize learning.',
    criteriaId: 4,
    weight: 14.29
  },
  {
    id: 'ClassroomClimate',
    name: 'Classroom Climate and Virtual Community',
    description: 'Classroom climate and virtual community referring to facilitating collaborative and effective interaction.',
    criteriaId: 5,
    weight: 14.29
  },
  {
    id: 'CourseOrganization',
    name: 'Course Organization',
    description: 'Course organization referring to objectives, concepts, examples, and program fragments discussed in class.',
    criteriaId: 6,
    weight: 14.29
  },
  {
    id: 'AssessmentMethods',
    name: 'Assessment Methods',
    description: 'Assessments referring to the activities required in the course to assess the competence of the students.',
    criteriaId: 7,
    weight: 14.27
  }
];