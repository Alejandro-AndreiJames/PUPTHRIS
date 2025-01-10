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
      // ... other basic details fields
    } = req.body;

    // First, update the BasicDetails table
    const result = await BasicDetails.update(req.body, {
      where: { BasicDetailsID: basicDetailsId },
      transaction
    });

    if (result[0] === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Basic details record not found' });
    }

    // Get the BasicDetails record to find the associated UserID
    const basicDetails = await BasicDetails.findByPk(basicDetailsId);
    
    // Update the corresponding User record
    await User.update({
      Surname: LastName,
      FirstName: FirstName,
      MiddleName: MiddleInitial, // Note: This might need adjustment based on your requirements
      NameExtension: NameExtension,
      Fcode: FacultyCode,
    }, {
      where: { UserID: basicDetails.UserID },
      transaction
    });

    await transaction.commit();

    // Fetch the updated BasicDetails record
    const updatedBasicDetails = await BasicDetails.findByPk(basicDetailsId);
    res.status(200).json(updatedBasicDetails);

  } catch (error) {
    await transaction.rollback();
    console.error('Error updating basic details:', error);
    res.status(500).json({ 
      message: 'Internal Server Error',
      error: error.message 
    });
  }
};

exports.getBasicDetails = async (req, res) => {
  try {
    const userId = req.params.userId;
    const basicDetails = await BasicDetails.findOne({ where: { UserID: userId } });
    if (basicDetails) {
      res.status(200).json(basicDetails);
    } else {
      res.status(404).send('Basic details record not found');
    }
  } catch (error) {
    console.error('Error getting basic details:', error);
    res.status(500).send('Internal Server Error');
  }
};
