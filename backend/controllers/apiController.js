const User = require('../models/userModel');

exports.getAllUserCredentials = async (req, res) => {
    try {
        // Assuming Taguig campus has ID 1 (adjust this based on your actual campus ID)
        const TAGUIG_CAMPUS_ID = 2;
        
        const users = await User.findAll({
            where: {
                CollegeCampusID: TAGUIG_CAMPUS_ID,
                isActive: true  // Optionally only get active users
            }
        });
        
        const credentials = users.map(user => ({
            id: user.UserID,
            code: user.Fcode,
            status: user.isActive ? 'Active' : 'Inactive',
            last_name: user.Surname,
            first_name: user.FirstName,
            middle_name: user.MiddleName || null,
            suffix_name: user.NameExtension || null,
            email: user.Email,
            type: user.EmploymentType.toLowerCase(),
            password: user.PasswordHash
        }));
        
        res.json(credentials);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};