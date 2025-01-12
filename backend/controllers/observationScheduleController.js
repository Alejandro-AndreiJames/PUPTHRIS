const ObservationSchedule = require('../models/observationScheduleModel');
const User = require('../models/userModel');

// Create a new observation schedule
exports.createSchedule = async (req, res) => {
  try {
    const {
      Topic,
      Subject,
      RoomNumber,
      ScheduledDate,
      StartTime,
      EndTime,
      AcademicYear,
      Semester,
      FacultyID
    } = req.body;

    const schedule = await ObservationSchedule.create({
      Topic,
      Subject,
      RoomNumber,
      ScheduledDate,
      StartTime,
      EndTime,
      AcademicYear,
      Semester,
      FacultyID,
      Status: 'Pending'
    });

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create schedule',
      error: error.message
    });
  }
};

// Get all schedules
exports.getAllSchedules = async (req, res) => {
  try {
    const schedules = await ObservationSchedule.findAll({
      include: [{
        model: User,
        as: 'ObservedFaculty',
        attributes: ['FirstName', 'LastName', 'Email']
      }],
      order: [['ScheduledDate', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch schedules',
      error: error.message 
    });
  }
};

// Get schedule by ID
exports.getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await ObservationSchedule.findByPk(id, {
      include: [{
        model: User,
        as: 'ObservedFaculty',
        attributes: ['FirstName', 'LastName', 'Email']
      }]
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch schedule',
      error: error.message 
    });
  }
};

// Update a schedule
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const schedule = await ObservationSchedule.findByPk(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    await schedule.update(updates);
    
    res.status(200).json({
      success: true,
      message: 'Schedule updated successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update schedule',
      error: error.message 
    });
  }
};

// Delete a schedule
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await ObservationSchedule.findByPk(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    await schedule.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete schedule',
      error: error.message 
    });
  }
};

// Add method to link evaluation to schedule
exports.linkEvaluation = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { evaluationId } = req.body;

    const schedule = await ObservationSchedule.findByPk(scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    await schedule.update({
      EvaluationID: evaluationId,
      Status: 'Completed'
    });

    res.status(200).json({
      success: true,
      message: 'Evaluation linked to schedule successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error linking evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link evaluation',
      error: error.message
    });
  }
};

// Get pending schedules
exports.getPendingSchedules = async (req, res) => {
  try {
    const schedules = await ObservationSchedule.findAll({
      where: { Status: 'Pending' },
      include: [{
        model: User,
        as: 'ObservedFaculty',
        attributes: ['FirstName', 'LastName', 'Email']
      }],
      order: [['ScheduledDate', 'ASC']]
    });

    res.status(200).json({
      success: true,
      message: 'Pending schedules retrieved successfully',
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching pending schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending schedules',
      error: error.message
    });
  }
};
