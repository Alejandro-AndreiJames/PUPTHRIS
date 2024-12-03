const User = require('../models/userModel');

exports.getUserCredentials = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Format the response according to their requirements
        const credentials = {
            id: user.UserID,
            code: user.Fcode,
            status: user.isActive ? 'Active' : 'Inactive',
            last_name: user.Surname,
            first_name: user.FirstName,
            middle_name: user.MiddleName || null,
            suffix_name: user.NameExtension || null,
            email: user.Email,
            type: user.EmploymentType.toLowerCase(),
            password: user.PasswordHash  // Note: You might want to handle this differently
        };
        
        res.json(credentials);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};