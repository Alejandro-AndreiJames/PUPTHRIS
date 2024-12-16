const { Sequelize, Op } = require('sequelize');
const User = require('../models/userModel');
const BasicDetails = require('../models/basicDetailsModel');
const Department = require('../models/departmentModel');
const Role = require('../models/roleModel'); // New Role model
const UserRole = require('../models/userRoleModel');
const AcademicRank = require('../models/academicRanksModel');
const Training = require('../models/trainingsModel');
const AchievementAward = require('../models/achievementAwardsModel');
const VoluntaryWork = require('../models/voluntaryworkModel');
const OfficerMembership = require('../models/officerMembershipModel');
const PersonalDetails = require('../models/personalDetailsModel');
const Education = require('../models/educationModel');
const ProfileImage = require('../models/profileImageModel');
const SpecialSkill = require('../models/specialSkillModel');
const moment = require('moment');
const EmploymentInformation = require('../models/employmentInformationModel');
const ProfessionalLicense = require('../models/professionalLicenseModel');

exports.getDashboardData = async (req, res) => {
  try {
    const { campusId } = req.query;

    // Base where clause for active users
    let userWhereClause = { isActive: true };
    
    // Add campusId to the where clause if provided
    if (campusId) {
      userWhereClause.CollegeCampusID = campusId;
    }

    // Count total females and males from BasicDetails
    const totalFemale = await BasicDetails.count({
      where: { Sex: 'Female' },
      include: [{
        model: User,
        where: userWhereClause,
        attributes: []
      }]
    });

    const totalMale = await BasicDetails.count({
      where: { Sex: 'Male' },
      include: [{
        model: User,
        where: userWhereClause,
        attributes: []
      }]
    });

    // Count employment types from User table
    const partTime = await User.count({ where: { ...userWhereClause, EmploymentType: 'parttime' } });
    const fullTime = await User.count({ where: { ...userWhereClause, EmploymentType: 'fulltime' } });
    const temporary = await User.count({ where: { ...userWhereClause, EmploymentType: 'temporary' } });
    const designee = await User.count({ where: { ...userWhereClause, EmploymentType: 'designee' } });

    // Count users who are faculty
    const faculty = await User.count({
      where: userWhereClause,
      include: [{
        model: Role,
        where: { RoleName: 'faculty' },
        through: { attributes: [] }
      }]
    });

    // Count users who are staff
    const staff = await User.count({
      where: userWhereClause,
      include: [{
        model: Role,
        where: { RoleName: 'staff' },
        through: { attributes: [] }
      }]
    });

    // Count academic ranks
    const academicRankCounts = await AcademicRank.findAll({
      attributes: [
        'Rank',
        [Sequelize.fn('COUNT', Sequelize.col('AcademicRankID')), 'count']
      ],
      include: [{
        model: User,
        where: userWhereClause,
        attributes: []
      }],
      group: ['Rank'],
      raw: true
    });

    // Get departments with count of users in each department
    const departments = await Department.findAll({
      where: campusId ? { CollegeCampusID: campusId } : {},
      attributes: [
        'DepartmentID',
        'DepartmentName',
        [Sequelize.literal(`(
          SELECT COUNT(*)
          FROM users
          WHERE 
            users.DepartmentID = Department.DepartmentID
            AND users.isActive = true
            ${campusId ? 'AND users.CollegeCampusID = :campusId' : ''}
        )`), 'count']
      ],
      replacements: campusId ? { campusId } : {},
      group: ['Department.DepartmentID', 'Department.DepartmentName'],
      raw: true,
      order: [['DepartmentName', 'ASC']]
    });

    // Count users with Master's degree
    const masters = await Education.count({
      where: { Level: 'MASTERS' },
      include: [{
        model: User,
        where: userWhereClause,
        attributes: []
      }]
    });

    // Count users with Doctorate degree
    const doctorate = await Education.count({
      where: { Level: 'DOCTORAL' },
      include: [{
        model: User,
        where: userWhereClause,
        attributes: []
      }]
    });

    res.status(200).json({
      totalFemale,
      totalMale,
      partTime,
      fullTime,
      temporary,
      designee,
      faculty,
      staff,
      departments,
      academicRanks: academicRankCounts,
      masters,
      doctorate,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
};

exports.getUserDashboardData = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const userData = await User.findOne({
      where: { UserID: userId },
      attributes: ['EmploymentType'],
      include: [
        {
          model: Department,
          as: 'Department',
          attributes: ['DepartmentName'],
        },
        {
          model: AcademicRank,
          attributes: ['Rank'],
        }
      ]
    });

    if (!userData) {
      return res.status(404).json({ message: 'User data not found' });
    }

    // Fetch counts for each category
    const trainingCount = await Training.count({ where: { UserID: userId } });
    const awardCount = await AchievementAward.count({ where: { UserID: userId } });
    const voluntaryWorkCount = await VoluntaryWork.count({ where: { userID: userId } });
    const membershipCount = await OfficerMembership.count({ where: { userID: userId } });

    const userDashboardData = {
      department: userData.Department ? userData.Department.DepartmentName : 'N/A',
      academicRank: userData.AcademicRank ? userData.AcademicRank.Rank : 'N/A',
      employmentType: userData.EmploymentType || 'N/A',
      activityCounts: {
        trainings: trainingCount,
        awards: awardCount,
        voluntaryActivities: voluntaryWorkCount,
        professionalMemberships: membershipCount
      }
    };

    res.status(200).json(userDashboardData);
  } catch (error) {
    console.error('Error fetching user dashboard data:', error);
    res.status(500).json({ message: 'Error fetching user dashboard data', error: error.message });
  }
};

exports.getUpcomingBirthdays = async (req, res) => {
  try {
    const today = moment();
    const start = today.startOf('day');
    const end = today.clone().add(7, 'days').endOf('day');

    console.log('Start Date:', start.format('YYYY-MM-DD'));
    console.log('End Date:', end.format('YYYY-MM-DD'));

    const upcomingBirthdays = await BasicDetails.findAll({
      where: Sequelize.where(
        Sequelize.fn('CONCAT',
          Sequelize.fn('MONTH', Sequelize.col('DateOfBirth')),
          '-',
          Sequelize.fn('DAY', Sequelize.col('DateOfBirth'))
        ),
        {
          [Op.between]: [
            `${start.month() + 1}-${start.date()}`,
            `${end.month() + 1}-${end.date()}`
          ]
        }
      ),
      include: [{
        model: User,
        where: { isActive: true },
        attributes: ['UserID']
      }],
      attributes: ['FirstName', 'LastName', 'DateOfBirth'],
      order: [['DateOfBirth', 'ASC']]
    });

    console.log('Upcoming Birthdays:', upcomingBirthdays);

    res.status(200).json(upcomingBirthdays);
  } catch (error) {
    console.error('Error fetching upcoming birthdays:', error);
    res.status(500).json({ message: 'Error fetching upcoming birthdays', error: error.message });
  }
};

exports.getAgeGroupData = async (req, res) => {
  try {
    const { campusId } = req.query;

    const ageGroups = await BasicDetails.findAll({
      attributes: [
        [Sequelize.literal(`
          CASE
            WHEN DATEDIFF(CURDATE(), DateOfBirth) / 365 < 25 THEN '18-24'
            WHEN DATEDIFF(CURDATE(), DateOfBirth) / 365 BETWEEN 25 AND 34 THEN '25-34'
            WHEN DATEDIFF(CURDATE(), DateOfBirth) / 365 BETWEEN 35 AND 44 THEN '35-44'
            WHEN DATEDIFF(CURDATE(), DateOfBirth) / 365 BETWEEN 45 AND 54 THEN '45-54'
            ELSE '55+'
          END
        `), 'ageGroup'],
        [Sequelize.fn('COUNT', Sequelize.col('BasicDetailsID')), 'count']
      ],
      include: [{
        model: User,
        where: {
          isActive: true,
          ...(campusId && { CollegeCampusID: campusId })
        },
        attributes: []
      }],
      group: ['ageGroup'],
      order: [[Sequelize.literal('ageGroup'), 'ASC']]
    });

    res.status(200).json(ageGroups);
  } catch (error) {
    console.error('Error fetching age group data:', error);
    res.status(500).json({ message: 'Error fetching age group data', error: error.message });
  }
};

exports.getProfileCompletion = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Fetch data from each model
    const basicDetails = await BasicDetails.findOne({ where: { UserID: userId } });
    const specialSkills = await SpecialSkill.findAll({ where: { userID: userId } });
    const voluntaryWork = await VoluntaryWork.findAll({ where: { userID: userId } });
    const achievementAwards = await AchievementAward.findAll({ where: { UserID: userId } });
    const personalDetails = await PersonalDetails.findOne({ where: { UserID: userId } });
    const officershipMembership = await OfficerMembership.findAll({ where: { UserID: userId } });
    const profileImage = await ProfileImage.findOne({ where: { UserID: userId } });
    const academicRank = await AcademicRank.findOne({ where: { UserID: userId } });
    const education = await Education.findAll({ where: { UserID: userId } });

    // Define the total number of sections
    const totalSections = 19;
    let completedSections = 0;
    const incompleteSections = [];

    // Check if each section is completed
    if (basicDetails) completedSections++; else incompleteSections.push('Add your basic details');
    if (personalDetails) completedSections++; else incompleteSections.push('Add your personal details');
    if (education.length > 0) completedSections++; else incompleteSections.push('Add your education details');
    if (profileImage) completedSections++; else incompleteSections.push('Add your profile image');
    if (academicRank) completedSections++; else incompleteSections.push('Add your academic rank');
    if (specialSkills.length > 0) completedSections++; else incompleteSections.push('Add your special skills');
    if (voluntaryWork.length > 0) completedSections++; else incompleteSections.push('Add your voluntary work');
    if (achievementAwards.length > 0) completedSections++; else incompleteSections.push('Add your achievement awards');
    if (officershipMembership.length > 0) completedSections++; else incompleteSections.push('Add your officership memberships');

    // Calculate the completion percentage
    const completionPercentage = (completedSections / totalSections) * 100;

    res.status(200).json({ completionPercentage, incompleteSections });
  } catch (error) {
    console.error('Error calculating profile completion:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getGovernmentIdCounts = async (req, res) => {
  try {
    const { campusId } = req.query;

    const userWhereClause = {
      isActive: true,
      ...(campusId && { CollegeCampusID: campusId })
    };

    const gsisCounts = await User.count({
      where: userWhereClause,
      include: [{
        model: PersonalDetails,
        as: 'personalDetails',
        where: {
          GSISNumber: {
            [Op.and]: {
              [Op.ne]: null,
              [Op.ne]: ''
            }
          }
        },
        required: true
      }]
    });

    const pagIbigCounts = await User.count({
      where: userWhereClause,
      include: [{
        model: PersonalDetails,
        as: 'personalDetails',
        where: {
          PagIbigNumber: {
            [Op.and]: {
              [Op.ne]: null,
              [Op.ne]: ''
            }
          }
        },
        required: true
      }]
    });

    const philHealthCounts = await User.count({
      where: userWhereClause,
      include: [{
        model: PersonalDetails,
        as: 'personalDetails',
        where: {
          PhilHealthNumber: {
            [Op.and]: {
              [Op.ne]: null,
              [Op.ne]: ''
            }
          }
        },
        required: true
      }]
    });

    const sssCounts = await User.count({
      where: userWhereClause,
      include: [{
        model: PersonalDetails,
        as: 'personalDetails',
        where: {
          SSSNumber: {
            [Op.and]: {
              [Op.ne]: null,
              [Op.ne]: ''
            }
          }
        },
        required: true
      }]
    });

    const tinCounts = await User.count({
      where: userWhereClause,
      include: [{
        model: PersonalDetails,
        as: 'personalDetails',
        where: {
          TINNumber: {
            [Op.and]: {
              [Op.ne]: null,
              [Op.ne]: ''
            }
          }
        },
        required: true
      }]
    });

    const agencyEmployeeCounts = await User.count({
      where: userWhereClause,
      include: [{
        model: PersonalDetails,
        as: 'personalDetails',
        where: {
          AgencyEmployeeNumber: {
            [Op.and]: {
              [Op.ne]: null,
              [Op.ne]: ''
            }
          }
        },
        required: true
      }]
    });

    res.status(200).json({
      governmentIds: {
        gsis: gsisCounts,
        pagIbig: pagIbigCounts,
        philHealth: philHealthCounts,
        sss: sssCounts,
        tin: tinCounts,
        agencyEmployee: agencyEmployeeCounts
      }
    });

  } catch (error) {
    console.error('Error fetching government ID counts:', error);
    res.status(500).json({ 
      message: 'Error fetching government ID counts', 
      error: error.message 
    });
  }
};

exports.getFemaleUsers = async (req, res) => {
  try {
    const { campusId } = req.query;

    const femaleUsers = await User.findAll({
      attributes: ['UserID', 'EmploymentType', 'Fcode'],
      where: {
        isActive: true,
        ...(campusId && { CollegeCampusID: campusId })
      },
      include: [
        {
          model: BasicDetails,
          where: { Sex: 'Female' },
          required: true,
          attributes: ['LastName', 'FirstName', 'MiddleInitial']
        },
        {
          model: Department,
          as: 'Department',
          attributes: ['DepartmentName']
        }
      ],
      order: [
        [BasicDetails, 'LastName', 'ASC'],
        [BasicDetails, 'FirstName', 'ASC']
      ]
    });

    const detailedUsers = await getUserDetailsWithEducation(femaleUsers);
    res.status(200).json(detailedUsers);
  } catch (error) {
    console.error('Error fetching female users:', error);
    res.status(500).json({ message: 'Error fetching female users', error: error.message });
  }
};

exports.getMaleUsers = async (req, res) => {
  try {
    const { campusId } = req.query;
    console.log('Fetching male users for campus:', campusId);

    const maleUsers = await User.findAll({
      attributes: ['UserID', 'EmploymentType', 'Fcode'],
      where: {
        isActive: true,
        ...(campusId && { CollegeCampusID: campusId })
      },
      include: [
        {
          model: BasicDetails,
          where: { Sex: 'Male' },
          required: true,
          attributes: ['LastName', 'FirstName', 'MiddleInitial']
        },
        {
          model: Department,
          as: 'Department',
          attributes: ['DepartmentName']
        }
      ],
      order: [
        [BasicDetails, 'LastName', 'ASC'],
        [BasicDetails, 'FirstName', 'ASC']
      ]
    });

    const detailedUsers = await getUserDetailsWithEducation(maleUsers);
    res.status(200).json(detailedUsers);
  } catch (error) {
    console.error('Error fetching male users:', error);
    res.status(500).json({ message: 'Error fetching male users', error: error.message });
  }
};

// Helper function to format education details
const getEducationDetails = async (userId) => {
  const education = await Education.findAll({
    where: { UserID: userId },
    order: [['YearGraduated', 'DESC']]
  });

  return {
    masters: education.find(e => e.Level === 'Masters'),
    doctoral: education.find(e => e.Level === 'Doctoral')
  };
};

// Helper function to get employment information
const getEmploymentInfo = async (userId) => {
  return await EmploymentInformation.findOne({
    where: { UserID: userId }
  });
};

// Helper function to get academic rank
const getAcademicRank = async (userId) => {
  return await AcademicRank.findOne({
    where: { UserID: userId }
  });
};

// Helper function to get professional license
const getProfessionalLicense = async (userId) => {
  return await ProfessionalLicense.findOne({
    where: { UserID: userId }
  });
};

// Update the existing user query functions to include detailed information
const getUserDetailsWithEducation = async (users) => {
  const detailedUsers = await Promise.all(users.map(async (user) => {
    const educationDetails = await getEducationDetails(user.UserID);
    const employmentInfo = await getEmploymentInfo(user.UserID);
    const academicRank = await getAcademicRank(user.UserID);
    const license = await getProfessionalLicense(user.UserID);
    const basicDetails = user.BasicDetail || {};

    return {
      id: user.UserID,
      name: `${basicDetails.LastName || ''}, ${basicDetails.FirstName || ''} ${basicDetails.MiddleInitial || ''}`.trim(),
      fcode: user.Fcode || 'N/A',
      department: user.Department?.DepartmentName || 'N/A',
      employmentType: user.EmploymentType || 'N/A',
      rank: academicRank?.Rank || 'N/A',
      initialEmploymentDate: employmentInfo?.DateHired || 'N/A',
      licenseNumber: license?.LicenseNumber || 'N/A',
      education: {
        masters: educationDetails.masters ? {
          school: educationDetails.masters.NameOfSchool,
          graduationDate: educationDetails.masters.YearGraduated
        } : null,
        doctoral: educationDetails.doctoral ? {
          school: educationDetails.doctoral.NameOfSchool,
          graduationDate: educationDetails.doctoral.YearGraduated
        } : null
      }
    };
  }));

  return detailedUsers;
};

// Update the existing controller methods
exports.getFacultyUsers = async (req, res) => {
  try {
    const { campusId } = req.query;
    const users = await User.findAll({
      where: {
        CollegeCampusID: campusId,
        isActive: true
      },
      include: [
        {
          model: Role,
          where: { RoleName: 'faculty' },
          through: UserRole
        },
        {
          model: BasicDetails,
          attributes: ['LastName', 'FirstName', 'MiddleInitial']
        },
        {
          model: Department,
          as: 'Department',
          attributes: ['DepartmentName']
        }
      ]
    });

    const detailedUsers = await getUserDetailsWithEducation(users);
    res.status(200).json(detailedUsers);
  } catch (error) {
    console.error('Error fetching faculty users:', error);
    res.status(500).json({ message: 'Error fetching faculty users', error: error.message });
  }
};

// Do the same for staff users
exports.getStaffUsers = async (req, res) => {
  try {
    const { campusId } = req.query;
    const users = await User.findAll({
      where: {
        CollegeCampusID: campusId,
        isActive: true
      },
      include: [
        {
          model: Role,
          where: { RoleName: 'staff' },
          through: UserRole
        },
        {
          model: BasicDetails,
          attributes: ['LastName', 'FirstName', 'MiddleInitial']
        },
        {
          model: Department,
          as: 'Department',
          attributes: ['DepartmentName']
        }
      ]
    });

    const detailedUsers = await getUserDetailsWithEducation(users);
    res.status(200).json(detailedUsers);
  } catch (error) {
    console.error('Error fetching staff users:', error);
    res.status(500).json({ message: 'Error fetching staff users', error: error.message });
  }
};

exports.getDoctorateUsers = async (req, res) => {
  try {
    const { campusId } = req.query;
    console.log('Fetching doctorate users for campus:', campusId);

    const doctorateUsers = await User.findAll({
      attributes: [
        'UserID', 
        'EmploymentType', 
        'Fcode'
      ],
      where: {
        isActive: true,
        ...(campusId && { CollegeCampusID: campusId })
      },
      include: [
        {
          model: BasicDetails,
          attributes: [
            'LastName',
            'FirstName',
            'MiddleInitial'
          ],
          required: false
        },
        {
          model: Department,
          as: 'Department',
          attributes: ['DepartmentName'],
          required: false
        },
        {
          model: Education,
          where: { Level: 'Doctoral' },
          required: true
        }
      ]
    });

    const detailedUsers = await getUserDetailsWithEducation(doctorateUsers);
    res.status(200).json(detailedUsers);

  } catch (error) {
    console.error('Error fetching doctorate users:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error fetching doctorate users', 
      error: error.message,
      stack: error.stack 
    });
  }
};

exports.getMastersUsers = async (req, res) => {
  try {
    const { campusId } = req.query;
    console.log('Fetching masters users for campus:', campusId);

    const mastersUsers = await User.findAll({
      attributes: [
        'UserID', 
        'EmploymentType', 
        'Fcode'
      ],
      where: {
        isActive: true,
        ...(campusId && { CollegeCampusID: campusId })
      },
      include: [
        {
          model: BasicDetails,
          attributes: [
            'LastName',
            'FirstName',
            'MiddleInitial'
          ],
          required: false
        },
        {
          model: Department,
          as: 'Department',
          attributes: ['DepartmentName'],
          required: false
        },
        {
          model: Education,
          where: { Level: 'Masters' },
          required: true
        }
      ]
    });

    const detailedUsers = await getUserDetailsWithEducation(mastersUsers);
    res.status(200).json(detailedUsers);

  } catch (error) {
    console.error('Error fetching masters users:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error fetching masters users', 
      error: error.message,
      stack: error.stack 
    });
  }
};