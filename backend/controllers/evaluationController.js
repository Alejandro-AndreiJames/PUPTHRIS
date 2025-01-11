const { Sequelize, Op } = require('sequelize');
const { sequelize } = require('../config/db.config');
const FacultyEvaluation = require('../models/facultyEvaluationModel');
const EvaluationScore = require('../models/evaluationScoresModel');
const User = require('../models/userModel');
const Department = require('../models/departmentModel');
const EvaluationCriteria = require('../models/evaluationCriteriaModel');
const Role = require('../models/roleModel');
const UserRole = require('../models/userRoleModel');

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
    const { campusId } = req.query;

    const facultyUsers = await User.findAll({
      where: {
        CollegeCampusID: campusId,
        isActive: true
      },
      include: [
        {
          model: Role,
          through: UserRole,
          where: { RoleName: 'faculty' },
          attributes: ['RoleName'],
          required: true
        },
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
          order: [
            ['AcademicYear', 'DESC'],
            ['Semester', 'DESC']
          ],
          limit: 6 // Increased to 6 to better analyze trends
        }
      ]
    });

    const immunityResults = facultyUsers.map(user => {
      const evaluations = user.FacultyEvaluations || [];
      const recentFourEvals = evaluations.slice(0, 4);
      
      // Basic immunity check
      const hasImmunity = recentFourEvals.length === 4 && 
        recentFourEvals.every(eval => eval.TotalScore >= 95);

      // Calculate average score
      const averageScore = evaluations.length > 0 
        ? evaluations.reduce((sum, eval) => sum + eval.TotalScore, 0) / evaluations.length 
        : 0;

      // Calculate performance metrics
      const performanceMetrics = calculatePerformanceMetrics(evaluations);

      // Generate insights and recommendations
      const insights = generateInsights(performanceMetrics, hasImmunity);

      return {
        faculty: {
          UserID: user.UserID,
          FirstName: user.FirstName,
          MiddleName: user.MiddleName,
          Surname: user.Surname,
          Department: user.Department?.DepartmentName,
          EmploymentType: user.EmploymentType
        },
        evaluationMetrics: {
          recentEvaluations: recentFourEvals.map(eval => ({
            academicYear: eval.AcademicYear,
            semester: eval.Semester,
            score: eval.TotalScore,
            rating: eval.QualitativeRating
          })),
          averageScore: Number(averageScore.toFixed(2)),
          hasImmunity,
          evaluationCount: recentFourEvals.length,
          allScoresAbove95: hasImmunity,
          performance: performanceMetrics,
          insights
        }
      };
    });

    // Filter and sort results
    const eligibleFaculty = immunityResults
      .filter(result => result.evaluationMetrics.evaluationCount === 4)
      .sort((a, b) => b.evaluationMetrics.averageScore - a.evaluationMetrics.averageScore);

    res.status(200).json(eligibleFaculty);

  } catch (error) {
    console.error('Error getting immunity eligible faculty:', error);
    res.status(500).json({ 
      error: 'Error getting immunity eligible faculty', 
      details: error.message 
    });
  }
};

// Helper function to calculate performance metrics
function calculatePerformanceMetrics(evaluations) {
  if (!evaluations.length) return null;

  const scores = evaluations.map(e => e.TotalScore);
  
  // Calculate trend
  const trend = calculateTrend(scores);
  
  // Calculate consistency
  const consistency = calculateConsistency(scores);
  
  // Calculate momentum
  const momentum = calculateMomentum(scores);

  return {
    trend,
    consistency,
    momentum,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    scoreRange: Math.max(...scores) - Math.min(...scores),
    sustainedExcellence: scores.every(score => score >= 95),
    nearImmunity: scores.filter(score => score >= 95).length >= 3
  };
}

// Helper function to calculate trend
function calculateTrend(scores) {
  if (scores.length < 2) return 'Insufficient Data';
  
  const recentScores = scores.slice(0, 2);
  const scoreDiff = recentScores[0] - recentScores[1];
  
  if (scoreDiff > 2) return 'Improving';
  if (scoreDiff < -2) return 'Declining';
  return 'Stable';
}

// Helper function to calculate consistency
function calculateConsistency(scores) {
  const standardDeviation = calculateStandardDeviation(scores);
  
  if (standardDeviation < 2) return 'Highly Consistent';
  if (standardDeviation < 5) return 'Consistent';
  return 'Variable';
}

// Helper function to calculate momentum
function calculateMomentum(scores) {
  if (scores.length < 3) return 'Insufficient Data';
  
  const recentThree = scores.slice(0, 3);
  const isIncreasing = recentThree.every((score, i) => 
    i === 0 || score <= recentThree[i - 1]
  );
  
  if (isIncreasing && recentThree[0] >= 95) return 'Strong Positive';
  if (isIncreasing) return 'Positive';
  return 'Neutral';
}

// Helper function to calculate standard deviation
function calculateStandardDeviation(scores) {
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const squareDiffs = scores.map(score => Math.pow(score - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
  return Math.sqrt(avgSquareDiff);
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
  } else if (metrics.nearImmunity) {
    insights.badges.push('Near Immunity Status');
    insights.recommendations.push('Close to achieving immunity - maintain high performance');
  }

  // Add performance-based insights
  if (metrics.trend === 'Improving') {
    insights.badges.push('Upward Trajectory');
  }

  if (metrics.consistency === 'Highly Consistent') {
    insights.badges.push('Consistency Champion');
  }

  // Add specific recommendations based on metrics
  if (metrics.trend === 'Declining') {
    insights.recommendations.push('Consider performance improvement strategies');
  }

  if (metrics.consistency === 'Variable') {
    insights.recommendations.push('Focus on maintaining consistent performance across semesters');
  }

  // Set overall performance level
  if (metrics.sustainedExcellence) {
    insights.performanceLevel = 'Outstanding';
  } else if (metrics.nearImmunity) {
    insights.performanceLevel = 'Very Good';
  } else {
    insights.performanceLevel = 'Good';
  }

  return insights;
}
