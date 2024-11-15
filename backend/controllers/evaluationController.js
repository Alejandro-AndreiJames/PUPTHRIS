const { Sequelize, Op } = require('sequelize');
const { sequelize } = require('../config/db.config');
const FacultyEvaluation = require('../models/facultyEvaluationModel');
const EvaluationScore = require('../models/evaluationScoresModel');
const User = require('../models/userModel');
const Department = require('../models/departmentModel');
const EvaluationCriteria = require('../models/evaluationCriteriaModel');
const Role = require('../models/roleModel');

exports.submitEvaluation = async (req, res) => {
  let transaction;
  
  try {
    transaction = await sequelize.transaction({
      timeout: 30000
    });
    
    const { 
      facultyId,
      academicYear,
      semester
    } = req.body;

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

    const { 
      evaluatorId,
      courseSection, 
      numberOfRespondents,
      scores,
      createdBy,
      totalScore,
      qualitativeRating
    } = req.body;

    if (!facultyId || !evaluatorId || !courseSection || 
        !numberOfRespondents || !scores || !createdBy || 
        !academicYear || !semester ||
        !Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ 
        error: 'Missing or invalid required fields'
      });
    }

    const evaluation = await FacultyEvaluation.create({
      FacultyID: facultyId,
      EvaluatorID: evaluatorId,
      AcademicYear: academicYear,
      Semester: semester,
      CourseSection: courseSection,
      NumberOfRespondents: numberOfRespondents,
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
      numberOfRespondents,
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
      NumberOfRespondents: numberOfRespondents,
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
