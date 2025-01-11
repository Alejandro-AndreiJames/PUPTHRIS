const BasicDetails = require('../models/basicDetailsModel');
const User = require('../models/userModel');
const { sequelize } = require('../config/db.config');

exports.addBasicDetails = async (req, res) => {
  try {
    const newBasicDetails = await BasicDetails.create(req.body);
    res.status(201).json(newBasicDetails);
  } catch (error) {
    console.error('Error adding basic details:', error);
    res.status(500).send('Internal Server Error');
  }
};

exports.updateBasicDetails = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const basicDetailsId = req.params.id;
    const {
      LastName,
      FirstName,
      MiddleInitial,
      NameExtension,
      FacultyCode,
      Email,
      EmployeeNo,
      DateOfBirth,
      Sex,
      Honorific,
      UserID
    } = req.body;

    // First, check if the record exists
    const existingBasicDetails = await BasicDetails.findOne({
      where: { 
        UserID: UserID  // Search by UserID instead of BasicDetailsID
      }
    });

    if (!existingBasicDetails) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Basic details record not found' });
    }

    // Update BasicDetails
    await BasicDetails.update({
      LastName,
      FirstName,
      MiddleInitial,
      NameExtension,
      FacultyCode,
      EmployeeNo,
      DateOfBirth,
      Sex,
      Honorific
    }, {
      where: { UserID: UserID },
      transaction
    });

    // Update User table
    await User.update({
      Surname: LastName,
      FirstName: FirstName,
      MiddleName: MiddleInitial,
      NameExtension: NameExtension,
      Fcode: FacultyCode,
      Email: Email
    }, {
      where: { UserID: UserID },
      transaction
    });

    await transaction.commit();

    // Fetch and return the updated record
    const updatedBasicDetails = await BasicDetails.findOne({
      where: { UserID: UserID },
      include: [{
        model: User,
        attributes: ['Email']
      }]
    });

    // Combine the data before sending response
    const response = {
      ...updatedBasicDetails.toJSON(),
      Email: updatedBasicDetails.User.Email
    };

    res.status(200).json(response);

  } catch (error) {
    await transaction.rollback();
    console.error('Error updating basic details:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

exports.getBasicDetails = async (req, res) => {
  try {
    const userId = req.params.userId;
    const basicDetails = await BasicDetails.findOne({
      where: { UserID: userId },
      include: [{
        model: User,
        attributes: ['Email']
      }]
    });

    if (basicDetails) {
      const response = {
        ...basicDetails.toJSON(),
        Email: basicDetails.User.Email
      };
      res.status(200).json(response);
    } else {
      const user = await User.findByPk(userId, {
        attributes: ['Email']
      });
      if (user) {
        res.status(200).json({ Email: user.Email });
      } else {
        res.status(404).send('User not found');
      }
    }
  } catch (error) {
    console.error('Error getting basic details:', error);
    res.status(500).send('Internal Server Error');
  }
};
