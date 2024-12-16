const User = require('./userModel');
const Department = require('./departmentModel');
const Coordinator = require('./coordinatorModel');
const BasicDetails = require('./basicDetailsModel');
const AcademicRank = require('./academicRanksModel');
const CollegeCampus = require('./collegeCampusModel');
const Role = require('./roleModel');
const UserRole = require('./userRoleModel');
const EvaluationCriteria = require('./evaluationCriteriaModel');
const FacultyEvaluation = require('./facultyEvaluationModel');
const EvaluationScore = require('./evaluationScoresModel');
const Education = require('./educationModel');
const ResearchPaper = require('./researchPaperModel');
const Book = require('./bookModel');
const LectureMaterial = require('./lectureMaterialModel');
const ProfessionalLicense = require('./professionalLicenseModel');
const EmploymentInformation = require('./employmentInformationModel');
const Certification = require('./certificationModel');
const PersonalDetails = require('./personalDetailsModel');

// CollegeCampus and User associations
CollegeCampus.hasMany(User, { foreignKey: 'CollegeCampusID', as: 'Users' });
User.belongsTo(CollegeCampus, { foreignKey: 'CollegeCampusID', as: 'CollegeCampus' });

// User and Department associations
Department.hasMany(User, { foreignKey: 'DepartmentID', as: 'Users' });
User.belongsTo(Department, { foreignKey: 'DepartmentID', as: 'Department' });

// Coordinator association
Department.belongsTo(User, { 
    foreignKey: 'CoordinatorID', 
    as: 'Coordinator'
});

User.hasOne(Department, {
    foreignKey: 'CoordinatorID',
    as: 'CoordinatedDepartment'
});


User.hasOne(BasicDetails, { foreignKey: 'UserID' });
BasicDetails.belongsTo(User, { foreignKey: 'UserID' });

User.hasOne(AcademicRank, { foreignKey: 'UserID' });
AcademicRank.belongsTo(User, { foreignKey: 'UserID' });

// You might want to add an association between Department and CollegeCampus if needed
CollegeCampus.hasMany(Department, { foreignKey: 'CollegeCampusID', as: 'Departments' });
Department.belongsTo(CollegeCampus, { foreignKey: 'CollegeCampusID', as: 'CollegeCampus' });

User.belongsToMany(Role, { 
  through: UserRole,
  foreignKey: 'UserID',
  otherKey: 'RoleID',
  timestamps: false
});

Role.belongsToMany(User, { 
  through: UserRole,
  foreignKey: 'RoleID',
  otherKey: 'UserID',
  timestamps: false
});

// Faculty Evaluation Associations
FacultyEvaluation.belongsTo(User, { foreignKey: 'FacultyID', as: 'Faculty' });
FacultyEvaluation.belongsTo(User, { foreignKey: 'CreatedBy', as: 'Evaluator' });
FacultyEvaluation.hasMany(EvaluationScore, { foreignKey: 'EvaluationID' });

EvaluationScore.belongsTo(FacultyEvaluation, { foreignKey: 'EvaluationID' });
EvaluationScore.belongsTo(EvaluationCriteria, { 
    foreignKey: 'CriteriaID',
    as: 'EvaluationCriteria'
});

EvaluationCriteria.hasMany(EvaluationScore, { 
    foreignKey: 'CriteriaID',
    as: 'Scores'
});

User.hasMany(FacultyEvaluation, { foreignKey: 'FacultyID', as: 'FacultyEvaluations' });

// Add Education associations
User.hasMany(Education, { foreignKey: 'UserID' });
Education.belongsTo(User, { foreignKey: 'UserID' });

// Add these new associations
User.hasMany(ResearchPaper, { foreignKey: 'UserID' });
ResearchPaper.belongsTo(User, { foreignKey: 'UserID' });

User.hasMany(Book, { foreignKey: 'UserID' });
Book.belongsTo(User, { foreignKey: 'UserID' });

User.hasMany(LectureMaterial, { foreignKey: 'UserID' });
LectureMaterial.belongsTo(User, { foreignKey: 'UserID' });
User.hasOne(EmploymentInformation, {
  foreignKey: 'UserID',
  as: 'employmentInformation'
});

User.hasMany(ProfessionalLicense, {
  foreignKey: 'UserID',
  as: 'professionalLicenses'
});

// Employment Information associations
EmploymentInformation.belongsTo(User, {
  foreignKey: 'UserID',
  as: 'user'
});

// Professional License associations
ProfessionalLicense.belongsTo(User, {
  foreignKey: 'UserID',
  as: 'user'
});

User.hasMany(Certification, {
    foreignKey: 'UserID',
    as: 'certifications'
});

Certification.belongsTo(User, {
    foreignKey: 'UserID',
    as: 'user'
});

User.hasOne(PersonalDetails, { 
    foreignKey: 'UserID',
    as: 'personalDetails'
});

PersonalDetails.belongsTo(User, {
    foreignKey: 'UserID',
    as: 'user'
});

module.exports = { 
    User, 
    Department, 
    Coordinator, 
    BasicDetails, 
    AcademicRank, 
    CollegeCampus, 
    EvaluationCriteria,
    FacultyEvaluation,
    EvaluationScore,
    Education,
    ResearchPaper,
    Book,
    LectureMaterial,
    EmploymentInformation,
    ProfessionalLicense,
    Certification,
    PersonalDetails
};
