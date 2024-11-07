const AcademicPeriod = require('../models/academicPeriodModel');

exports.createAcademicPeriod = async (req, res) => {
  try {
    const { AcademicYear, Semester } = req.body;
    const newPeriod = await AcademicPeriod.create({
      AcademicYear,
      Semester,
      IsActive: false
    });
    res.status(201).json(newPeriod);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllAcademicPeriods = async (req, res) => {
  try {
    const periods = await AcademicPeriod.findAll({
      order: [['AcademicYear', 'DESC'], ['Semester', 'ASC']]
    });
    res.status(200).json(periods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.setActivePeriod = async (req, res) => {
  try {
    const { periodId } = req.params;
    
    // First, set all periods to inactive
    await AcademicPeriod.update(
      { IsActive: false },
      { where: {} }
    );

    // Then set the selected period to active
    const period = await AcademicPeriod.update(
      { IsActive: true },
      { where: { PeriodID: periodId } }
    );

    res.status(200).json({ message: 'Academic period updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
