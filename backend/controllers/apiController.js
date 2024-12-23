const User = require('../models/userModel');

exports.getAllUserCredentials = async (req, res) => {
    try {
        const TAGUIG_CAMPUS_ID = 2;
        
        const users = await User.findAll({
            where: {
                CollegeCampusID: TAGUIG_CAMPUS_ID,
                isActive: true
            },
            attributes: [
                'UserID',
                'Fcode',
                'isActive',
                'Surname',
                'FirstName',
                'MiddleName',
                'NameExtension',
                'Email',
                'EmploymentType'
            ]
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
            type: user.EmploymentType.toLowerCase()
        }));
        
        res.json(credentials);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};