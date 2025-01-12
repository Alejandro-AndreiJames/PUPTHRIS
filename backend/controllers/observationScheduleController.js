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
    const { campusId } = req.query;
    console.log('Raw campusId from query:', campusId);
    
    // Base where clauses
    let scheduleWhereClause = {};
    let userWhereClause = { isActive: true };
    
    // Only add campus filter if campusId is valid
    if (campusId && typeof campusId === 'string') {
      const parsedCampusId = parseInt(campusId, 10);
      if (!isNaN(parsedCampusId)) {
        userWhereClause.CollegeCampusID = parsedCampusId;
        scheduleWhereClause.CollegeCampusID = parsedCampusId;
      }
    }

    console.log('Schedule where clause:', scheduleWhereClause);
    console.log('User where clause:', userWhereClause);

    const schedules = await ObservationSchedule.findAll({
      where: scheduleWhereClause,
      include: [{
        model: User,
        as: 'ObservedFaculty',
        attributes: ['UserID', 'FirstName', 'Surname', 'Email'],
        where: userWhereClause,
        required: true
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log('Found schedules:', schedules.length);

    const formattedSchedules = schedules.map(schedule => {
      const faculty = schedule.ObservedFaculty || {};
      return {
        ...schedule.toJSON(),
        Faculty: {
          FirstName: faculty.FirstName || '',
          LastName: faculty.Surname || '',
          Email: faculty.Email || ''
        }
      };
    });

    res.status(200).json({
      success: true,
      data: formattedSchedules
    });

  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching schedules',
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
        attributes: ['firstname', 'lastname', 'email']
      }]
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const transformedSchedule = {
      ...schedule.toJSON(),
      Faculty: {
        FirstName: schedule.ObservedFaculty?.firstname,
        LastName: schedule.ObservedFaculty?.lastname,
        Email: schedule.ObservedFaculty?.email
      }
    };

    res.status(200).json({
      success: true,
      data: transformedSchedule
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

    // Validate status if it's being updated
    if (updates.Status && !['Pending', 'Completed', 'Cancelled'].includes(updates.Status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
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
    const { campusId } = req.query;

    // Base where clause
    let whereClause = { Status: 'Pending' };
    if (campusId) {
      whereClause.CollegeCampusID = campusId;
    }

    const schedules = await ObservationSchedule.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'ObservedFaculty',
        attributes: ['firstname', 'lastname', 'email']
      }],
      order: [['ScheduledDate', 'ASC']]
    });

    const transformedSchedules = schedules.map(schedule => ({
      ...schedule.toJSON(),
      Faculty: {
        FirstName: schedule.ObservedFaculty?.firstname,
        LastName: schedule.ObservedFaculty?.lastname,
        Email: schedule.ObservedFaculty?.email
      }
    }));

    res.status(200).json({
      success: true,
      message: 'Pending schedules retrieved successfully',
      data: transformedSchedules
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

// Get schedules for a specific faculty
exports.getFacultySchedules = async (req, res) => {
  try {
    const { facultyId } = req.params;
    
    const schedules = await ObservationSchedule.findAll({
      where: { FacultyID: facultyId },
      include: [{
        model: User,
        as: 'ObservedFaculty',
        attributes: ['UserID', 'FirstName', 'Surname', 'Email']
      }],
      order: [['createdAt', 'DESC']]
    });

    const transformedSchedules = schedules.map(schedule => ({
      ...schedule.toJSON(),
      Faculty: {
        FirstName: schedule.ObservedFaculty?.FirstName,
        LastName: schedule.ObservedFaculty?.Surname,
        Email: schedule.ObservedFaculty?.Email
      }
    }));

    res.status(200).json({
      success: true,
      data: transformedSchedules
    });
  } catch (error) {
    console.error('Error fetching faculty schedules:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch faculty schedules',
      error: error.message 
    });
  }
};
