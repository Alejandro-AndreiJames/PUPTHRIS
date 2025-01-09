const User = require('../models/userModel');
const Department = require('../models/departmentModel');
const Role = require('../models/roleModel');

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

exports.getAllDepartments = async (req, res) => {
    try {
        const TAGUIG_CAMPUS_ID = 2;
        
        const departments = await Department.findAll({
            where: {
                CollegeCampusID: TAGUIG_CAMPUS_ID
            },
            attributes: [
                'DepartmentID',
                'DepartmentName',
                'createdAt',
                'updatedAt'
            ]
        });
        
        const formattedDepartments = departments.map(dept => ({
            department_id: dept.DepartmentID,
            name: dept.DepartmentName,
            created_at: dept.createdAt,
            updated_at: dept.updatedAt
        }));
        
        res.json({ department: formattedDepartments });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getAllUserLogin = async (req, res) => {
    try {
        const TAGUIG_CAMPUS_ID = 1;
        
        const users = await User.findAll({
            where: {
                CollegeCampusID: TAGUIG_CAMPUS_ID,
                isActive: true
            },
            include: [{
                model: Role,
                through: { attributes: [] },
                attributes: ['RoleName']
            }],
            attributes: [
                'UserID',
                'Email',
                'PasswordHash',
                'Fcode',
                'Surname',
                'FirstName',
                'MiddleName',
                'NameExtension',
                'EmploymentType',
                'DepartmentID',
                'CreatedAt'
            ]
        });
        
        const userLogin = users.map(user => ({
            user_login_id: user.UserID,
            email: user.Email,
            password: user.PasswordHash,
            role: user.Roles[0]?.RoleName.toLowerCase() || 'faculty',
            Fcode: user.Fcode,
            surname: user.Surname,
            first_name: user.FirstName,
            middle_name: user.MiddleName || null,
            name_extension: user.NameExtension || null,
            employment_type: user.EmploymentType.toLowerCase(),
            department_id: user.DepartmentID,
            created_at: user.CreatedAt,
            updated_at: user.CreatedAt
        }));
        
        res.json({ user_login: userLogin });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};