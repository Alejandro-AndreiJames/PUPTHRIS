const { Sequelize, Op } = require('sequelize');
const { sequelize } = require('../config/db.config');
const FacultyEvaluation = require('../models/facultyEvaluationModel');
const EvaluationScore = require('../models/evaluationScoresModel');
const User = require('../models/userModel');
const Department = require('../models/departmentModel');
const EvaluationCriteria = require('../models/evaluationCriteriaModel');
const Role = require('../models/roleModel');
const UserRole = require('../models/userRoleModel');
const { 
  BasicInformation: BasicDetail  // Note: Using BasicInformation as BasicDetail
} = require('../models/basicDetailsModel');
const AcademicRank = require('../models/academicRanksModel');
const ObservationSchedule = require('../models/observationScheduleModel');

exports.submitEvaluation = async (req, res) => {
  let transaction;
  
  try {
    transaction = await sequelize.transaction({
      timeout: 30000
    });
    
    const { 
      facultyId,
      academicYear,
      semester,
      evaluatorId,
      courseSection, 
      comments,
      scores,
      createdBy,
      totalScore,
      qualitativeRating
    } = req.body;

    // Validate that all 7 criteria are present
    const requiredCriteriaIds = [1, 2, 3, 4, 5, 6, 7]; // Updated to include new criteria
    const hasAllCriteria = requiredCriteriaIds.every(id => 
      scores.some(score => score.CriteriaID === id)
    );

    if (!hasAllCriteria) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'All evaluation criteria must be scored' 
      });
    }

    // Validate scores are within range
    const validScores = scores.every(score => 
      score.Score >= 0 && score.Score <= 100
    );

    if (!validScores) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'All scores must be between 0 and 100' 
      });
    }

    const existingEvaluation = await FacultyEvaluation.findOne({
      where: {
        FacultyID: facultyId,
        AcademicYear: academicYear,
        Semester: semester
      },
      transaction,
      lock: true
    });

    if (existingEvaluation) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'An evaluation already exists for this faculty member in the specified academic period',
        existingEvaluation: {
          evaluationId: existingEvaluation.EvaluationID,
          academicYear: existingEvaluation.AcademicYear,
          semester: existingEvaluation.Semester
        }
      });
    }

    const evaluation = await FacultyEvaluation.create({
      FacultyID: facultyId,
      EvaluatorID: evaluatorId,
      AcademicYear: academicYear,
      Semester: semester,
      CourseSection: courseSection,
      Comments: comments,
      TotalScore: totalScore,
      QualitativeRating: qualitativeRating,
      CreatedBy: createdBy
    }, { transaction });

    // Check for matching observation schedule
    const schedule = await ObservationSchedule.findOne({
      where: {
        FacultyID: facultyId,
        AcademicYear: academicYear,
        Semester: semester
      },
      transaction
    });

    if (schedule) {
      // Update the observation schedule status
      await schedule.update({ Status: 'Completed' }, { transaction });
    }

    const chunkSize = 5;
    for (let i = 0; i < scores.length; i += chunkSize) {
      const chunk = scores.slice(i, i + chunkSize);
      await Promise.all(chunk.map(score => 
        EvaluationScore.create({
          EvaluationID: evaluation.EvaluationID,
          CriteriaID: score.CriteriaID,
          Score: score.Score
        }, { transaction })
      ));
    }

    await transaction.commit();
    res.status(201).json(evaluation);
  } catch (error) {
    console.error('Evaluation submission error:', error);
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }
    if (error.name === 'SequelizeConnectionAcquireTimeoutError') {
      return res.status(503).json({ 
        error: 'Service temporarily unavailable. Please try again.' 
      });
    }
    res.status(500).json({ error: 'Failed to submit evaluation' });
  }
};

exports.getFacultyEvaluations = async (req, res) => {
  try {
    const { academicYear, semester, departmentId } = req.query;
    
    const whereClause = {};
    if (academicYear) whereClause.AcademicYear = academicYear;
    if (semester) whereClause.Semester = semester;

    const evaluations = await FacultyEvaluation.findAll({
      include: [
        {
          model: User,
          as: 'Faculty',
          attributes: ['FirstName', 'Surname', 'DepartmentID'],
          where: departmentId ? { DepartmentID: departmentId } : {},
          include: [{
            model: Department,
            attributes: ['DepartmentName']
          }]
        },
        {
          model: EvaluationScore,
          include: ['EvaluationCriteria']
        }
      ],
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(evaluations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEvaluationStatistics = async (req, res) => {
  try {
    const { academicYear, semester } = req.query;
    
    const whereClause = {};
    if (academicYear) whereClause.AcademicYear = academicYear;
    if (semester) whereClause.Semester = semester;
    
    const statistics = await FacultyEvaluation.findAll({
      where: whereClause,
      attributes: [
        'QualitativeRating',
        [Sequelize.fn('COUNT', Sequelize.col('EvaluationID')), 'count']
      ],
      group: ['QualitativeRating']
    });

    res.status(200).json(statistics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEvaluationCriteria = async (req, res) => {
  try {
    const criteria = await EvaluationCriteria.findAll({
      order: [
        ['Category', 'ASC'],
        ['createdAt', 'ASC']
      ]
    });

    // Ensure all 7 categories are represented
    const expectedCategories = [
      'Instruction and Discussion Facilitation',
      'Commitment',
      'Teaching for Independent Learning',
      'Use of Instructional Materials',
      'Classroom Climate',
      'Course Organization',
      'Assessment Methods'
    ];

    const missingCategories = expectedCategories.filter(category => 
      !criteria.some(criterion => criterion.Category === category)
    );

    if (missingCategories.length > 0) {
      console.warn('Missing evaluation categories:', missingCategories);
    }

    const groupedCriteria = criteria.reduce((acc, criterion) => {
      if (!acc[criterion.Category]) {
        acc[criterion.Category] = {
          description: criterion.CategoryDescription,
          criteria: []
        };
      }
      acc[criterion.Category].criteria.push(criterion);
      return acc;
    }, {});

    res.status(200).json(groupedCriteria);
  } catch (error) {
    console.error('Error fetching evaluation criteria:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createEvaluationCriteria = async (req, res) => {
  try {
    const { CriteriaName, Description, Weight, Category } = req.body;
    
    const existingCriteria = await EvaluationCriteria.findAll({
      where: { Category }
    });
    const totalWeight = existingCriteria.reduce((sum, criterion) => sum + criterion.Weight, 0) + Weight;
    
    if (totalWeight > 100) {
      return res.status(400).json({ 
        error: `Total weight for category "${Category}" cannot exceed 100%` 
      });
    }

    const newCriteria = await EvaluationCriteria.create({
      CriteriaName,
      Description,
      Weight,
      Category
    });

    res.status(201).json(newCriteria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateEvaluationCriteria = async (req, res) => {
  try {
    const { criteriaId } = req.params;
    const { CriteriaName, Description, Weight, Category } = req.body;

    const otherCriteria = await EvaluationCriteria.findAll({
      where: {
        Category,
        CriteriaID: {
          [Op.ne]: criteriaId
        }
      }
    });

    const totalWeight = otherCriteria.reduce((sum, criterion) => sum + criterion.Weight, 0) + Weight;

    if (totalWeight > 100) {
      return res.status(400).json({ 
        error: `Total weight for category "${Category}" cannot exceed 100%` 
      });
    }

    const [updated] = await EvaluationCriteria.update({
      CriteriaName,
      Description,
      Weight,
      Category
    }, {
      where: { CriteriaID: criteriaId }
    });

    if (!updated) {
      return res.status(404).json({ error: 'Criteria not found' });
    }

    const updatedCriteria = await EvaluationCriteria.findByPk(criteriaId);
    res.status(200).json(updatedCriteria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteEvaluationCriteria = async (req, res) => {
  try {
    const { criteriaId } = req.params;
    
    const usedInEvaluations = await EvaluationScore.findOne({
      where: { CriteriaID: criteriaId }
    });

    if (usedInEvaluations) {
      return res.status(400).json({ 
        error: 'Cannot delete criteria that has been used in evaluations' 
      });
    }

    const deleted = await EvaluationCriteria.destroy({
      where: { CriteriaID: criteriaId }
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Criteria not found' });
    }

    res.status(200).json({ message: 'Criteria deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFacultyEvaluationHistory = async (req, res) => {
  try {
    const { facultyId } = req.params;
    
    const evaluations = await FacultyEvaluation.findAll({
      where: { FacultyID: facultyId },
      include: [{
        model: EvaluationScore,
        include: [{
          model: EvaluationCriteria,
          as: 'EvaluationCriteria'
        }]
      }],
      order: [
        ['AcademicYear', 'DESC'],
        ['Semester', 'DESC']
      ]
    });

    if (!evaluations) {
      return res.status(404).json({ error: 'No evaluation history found' });
    }

    res.status(200).json(evaluations);
  } catch (error) {
    console.error('Error fetching evaluation history:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateEvaluation = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { evaluationId } = req.params;
    const {
      courseSection,
      comments,
      scores,
      totalScore,
      qualitativeRating
    } = req.body;

    console.log('Updating evaluation:', { evaluationId, totalScore, scores });

    const evaluation = await FacultyEvaluation.findByPk(evaluationId);
    if (!evaluation) {
      await t.rollback();
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    await evaluation.update({
      CourseSection: courseSection,
      Comments: comments,
      TotalScore: totalScore,
      QualitativeRating: qualitativeRating
    }, { transaction: t });

    await EvaluationScore.destroy({
      where: { EvaluationID: evaluationId },
      transaction: t
    });

    await Promise.all(scores.map(score => 
      EvaluationScore.create({
        EvaluationID: evaluationId,
        CriteriaID: score.CriteriaID,
        Score: score.Score
      }, { transaction: t })
    ));

    await t.commit();
    res.status(200).json({ message: 'Evaluation updated successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error updating evaluation:', error);
    res.status(500).json({ 
      error: 'Error updating evaluation',
      details: error.message 
    });
  }
};

exports.deleteEvaluation = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { evaluationId } = req.params;

    const evaluation = await FacultyEvaluation.findByPk(evaluationId);
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    await EvaluationScore.destroy({
      where: { EvaluationID: evaluationId },
      transaction: t
    });

    await FacultyEvaluation.destroy({
      where: { EvaluationID: evaluationId },
      transaction: t
    });

    await t.commit();
    res.status(200).json({ message: 'Evaluation deleted successfully' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.getEvaluationRatingDistribution = async (req, res) => {
  try {
    const { campusId } = req.params;
    const { academicYear, semester } = req.query;

    const whereClause = {};
    
    if (academicYear) {
      whereClause.AcademicYear = academicYear;
    }
    
    if (semester) {
      whereClause.Semester = semester;
    }

    const distribution = await FacultyEvaluation.findAll({
      where: whereClause,
      attributes: [
        'QualitativeRating',
        [sequelize.fn('COUNT', sequelize.col('EvaluationID')), 'count']
      ],
      include: [{
        model: User,
        as: 'Faculty',
        where: { 
          CollegeCampusID: campusId,
          isActive: true
        },
        include: [{
          model: Role,
          where: { RoleName: 'faculty' },
          through: { attributes: [] },
          attributes: []
        }],
        attributes: []
      }],
      group: ['QualitativeRating'],
      order: [
        ['QualitativeRating', 'DESC']
      ]
    });

    const ratingCategories = ['Outstanding', 'Very Satisfactory', 'Satisfactory', 'Fair', 'Poor'];
    const formattedDistribution = ratingCategories.map(rating => {
      const found = distribution.find(d => d.QualitativeRating === rating);
      return {
        rating,
        count: found ? parseInt(found.get('count')) : 0
      };
    });

    res.status(200).json(formattedDistribution);
  } catch (error) {
    console.error('Error getting evaluation distribution:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getFacultiesByRating = async (req, res) => {
  try {
    const { campusId } = req.params;
    const { academicYear, semester, rating } = req.query;

    const faculties = await FacultyEvaluation.findAll({
      where: {
        QualitativeRating: rating,
        ...(academicYear && { AcademicYear: academicYear }),
        ...(semester && { Semester: semester })
      },
      include: [{
        model: User,
        as: 'Faculty',
        where: { 
          CollegeCampusID: campusId,
          isActive: true
        },
        include: [{
          model: Department,
          as: 'Department',
          attributes: ['DepartmentName']
        }],
        attributes: ['FirstName', 'MiddleName', 'Surname', 'DepartmentID']
      }],
      order: [
        [{ model: User, as: 'Faculty' }, 'Surname', 'ASC']
      ]
    });

    res.status(200).json(faculties);
  } catch (error) {
    console.error('Error getting faculties by rating:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getImmunityEligibleFaculty = async (req, res) => {
  try {
    const { campusId, departmentId, immunityStatus } = req.query;

    const whereClause = {
      isActive: true,
      CollegeCampusID: campusId
    };

    if (departmentId) {
      whereClause.DepartmentID = departmentId;
    }

    const users = await User.findAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: 'Department',
          attributes: ['DepartmentName']
        },
        {
          model: FacultyEvaluation,
          as: 'FacultyEvaluations',
          required: false,
          separate: true,
          limit: 6,
          order: [
            ['AcademicYear', 'DESC'],
            ['Semester', 'DESC']
          ],
          attributes: [
            'AcademicYear',
            'Semester',
            'QualitativeRating',
            'TotalScore'
          ]
        },
        {
          model: Role,
          where: { RoleName: 'faculty' },
          through: { attributes: [] },
          attributes: []
        }
      ],
      attributes: [
        'UserID', 
        'Email', 
        'Fcode',
        'FirstName',
        'MiddleName', 
        'Surname'
      ]
    });

    // Transform data to match dashboard interface
    const eligibleFaculty = users.map(user => {
      const plainUser = user.get({ plain: true });
      const evaluations = plainUser.FacultyEvaluations || [];
      
      // Count consecutive evaluations with scores >= 95
      let consecutiveHighScores = 0;
      let currentStreak = 0;
      
      // Sort evaluations by academic year and semester in descending order
      const sortedEvaluations = evaluations.sort((a, b) => {
        if (a.AcademicYear === b.AcademicYear) {
          // For same academic year, sort by semester (Second comes before First)
          return b.Semester.localeCompare(a.Semester);
        }
        return b.AcademicYear.localeCompare(a.AcademicYear);
      });

      // Count consecutive scores >= 95
      for (const eval of sortedEvaluations) {
        if (Number(eval.TotalScore) >= 95) {
          currentStreak++;
          consecutiveHighScores = Math.max(consecutiveHighScores, currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      // Calculate average rating from TotalScore
      const averageRating = evaluations.length > 0
        ? Number((evaluations.reduce((sum, eval) => sum + Number(eval.TotalScore), 0) / evaluations.length).toFixed(2))
        : 0;

      // Calculate consistency score
      let consistencyScore = 0;
      if (evaluations.length > 0) {
        const scores = evaluations.map(e => Number(e.TotalScore));
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        consistencyScore = Number((100 - (stdDev / mean) * 100).toFixed(2));
        consistencyScore = Math.max(0, Math.min(100, consistencyScore));
      }

      return {
        Name: `${plainUser.FirstName} ${plainUser.MiddleName ? plainUser.MiddleName + ' ' : ''}${plainUser.Surname}`,
        Department: plainUser.Department?.DepartmentName || 'N/A',
        outstandingCount: consecutiveHighScores, // Using consecutive count instead of total count
        averageRating,
        consistencyScore,
        FacultyEvaluations: sortedEvaluations.map(eval => ({
          ...eval,
          TotalScore: Number(eval.TotalScore),
          Status: Number(eval.TotalScore) >= 95 ? 'Outstanding' : 
                  Number(eval.TotalScore) >= 90 ? 'Very Satisfactory' : 
                  'Other'
        }))
      };
    }).filter(faculty => {
      if (immunityStatus === 'immune') {
        return faculty.outstandingCount >= 4;
      } else if (immunityStatus === 'pending') {
        return faculty.outstandingCount < 4;
      }
      return true;
    });

    res.status(200).json(eligibleFaculty);
  } catch (error) {
    console.error('Error in getImmunityEligibleFaculty:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to calculate metrics
function calculateMetrics(evaluations) {
  if (!evaluations || evaluations.length === 0) {
    return {
      trend: 'Neutral',
      consistency: 'Variable',
      nearImmunity: false,
      sustainedExcellence: false
    };
  }

  // Calculate trend
  const recentScores = evaluations.slice(0, 3).map(e => e.TotalScore);
  const trend = calculateTrend(recentScores);

  // Calculate consistency
  const stdDev = calculateStandardDeviation(recentScores);
  const consistency = stdDev < 5 ? 'Highly Consistent' : 
                     stdDev < 10 ? 'Consistent' : 'Variable';

  // Check near immunity status
  const nearImmunity = evaluations.length >= 5 && 
    evaluations.slice(0, 5).every(eval => 
      eval.QualitativeRating === 'Outstanding' || 
      eval.QualitativeRating === 'Very Satisfactory'
    );

  // Check sustained excellence
  const sustainedExcellence = evaluations.length >= 3 && 
    evaluations.slice(0, 3).every(eval => 
      eval.QualitativeRating === 'Outstanding'
    );

  return {
    trend,
    consistency,
    nearImmunity,
    sustainedExcellence
  };
}

// Helper function to generate insights
function generateInsights(metrics, hasImmunity) {
  const insights = {
    status: hasImmunity ? 'Immune' : 'Not Immune',
    performanceLevel: '',
    recommendations: [],
    badges: []
  };

  if (hasImmunity) {
    insights.badges.push('Classroom Observation Immunity Achieved');
    insights.recommendations.push('Maintain excellent performance to retain immunity status');
  } else if (metrics.highPerformanceCount >= 3) {
    insights.badges.push('Near Immunity Status');
    insights.recommendations.push('Close to achieving immunity - maintain high performance');
  }

  if (metrics.trend === 'Improving') {
    insights.badges.push('Upward Trajectory');
  }

  if (metrics.consistency === 'Highly Consistent') {
    insights.badges.push('Consistency Champion');
  }

  if (metrics.sustainedExcellence) {
    insights.performanceLevel = 'Outstanding';
  } else if (metrics.nearImmunity) {
    insights.performanceLevel = 'Very Good';
  } else {
    insights.performanceLevel = 'Good';
  }

  return insights;
}

// Helper function to calculate trend
function calculateTrend(scores) {
  if (scores.length < 2) return 'Neutral';
  
  const trend = scores[0] - scores[scores.length - 1];
  return trend > 0 ? 'Improving' : 
         trend < 0 ? 'Declining' : 'Stable';
}

// Helper function to calculate standard deviation
function calculateStandardDeviation(scores) {
  if (scores.length === 0) return 0;
  
  const mean = scores.reduce((a, b) => a + b) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
  return Math.sqrt(variance);
}
