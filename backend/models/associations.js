const User = require('./userModel');
const Department = require('./departmentModel');
const Coordinator = require('./coordinatorModel');
const CivilServiceEligibility = require('./CivilServiceEligibility');
const WorkExperience = require('./workexperienceModel');
const BasicDetails = require('./basicDetailsModel');
const AcademicRank = require('./academicRanksModel');
const CollegeCampus = require('./collegeCampusModel');
const Role = require('./roleModel');
const UserRole = require('./userRoleModel');
const AcademicPeriod = require('./academicPeriodModel');
const EvaluationCriteria = require('./evaluationCriteriaModel');
const FacultyEvaluation = require('./facultyEvaluationModel');
const EvaluationScore = require('./evaluationScoresModel');

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

// Civil Service Eligibility associations
User.hasMany(CivilServiceEligibility, { foreignKey: 'userID' });
CivilServiceEligibility.belongsTo(User, { foreignKey: 'userID' });

// Work Experience associations
User.hasMany(WorkExperience, { foreignKey: 'userID' });
WorkExperience.belongsTo(User, { foreignKey: 'userID' });

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
EvaluationScore.belongsTo(EvaluationCriteria, { foreignKey: 'CriteriaID' });

AcademicPeriod.hasMany(FacultyEvaluation, {
  foreignKey: 'PeriodID',
  constraints: true,
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

FacultyEvaluation.belongsTo(AcademicPeriod, {
  foreignKey: 'PeriodID'
});

module.exports = { 
    User, 
    Department, 
    Coordinator, 
    CivilServiceEligibility, 
    WorkExperience, 
    BasicDetails, 
    AcademicRank, 
    CollegeCampus, 
    AcademicPeriod,
    EvaluationCriteria,
    FacultyEvaluation,
    EvaluationScore
};
