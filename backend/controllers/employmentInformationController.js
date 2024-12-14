const EmploymentInformation = require('../models/employmentInformationModel');

exports.getEmploymentInfo = async (req, res) => {
    try {
        const { userId } = req.params;
        const employmentInfo = await EmploymentInformation.findOne({
            where: { UserID: userId }
        });

        if (!employmentInfo) {
            return res.status(404).json({ message: 'Employment information not found' });
        }

        res.status(200).json(employmentInfo);
    } catch (error) {
        console.error('Error fetching employment information:', error);
        res.status(500).json({ message: 'Error fetching employment information' });
    }
};

exports.updateEmploymentInfo = async (req, res) => {
    try {
        const { userId } = req.params;
        const employmentData = {
            AnnualSalary: req.body.AnnualSalary,
            SalaryGradeStep: req.body.SalaryGradeStep,
            RatePerHour: req.body.RatePerHour,
            DateOfLastPromotion: req.body.DateOfLastPromotion,
            InitialYearOfTeaching: req.body.InitialYearOfTeaching
        };

        // Find or create employment information
        const [employmentInfo, created] = await EmploymentInformation.findOrCreate({
            where: { UserID: userId },
            defaults: { ...employmentData, UserID: userId }
        });

        if (!created) {
            // Update existing record
            await employmentInfo.update(employmentData);
        }

        const updatedInfo = await EmploymentInformation.findOne({
            where: { UserID: userId }
        });

        res.status(200).json(updatedInfo);
    } catch (error) {
        console.error('Error updating employment information:', error);
        res.status(500).json({ message: 'Error updating employment information' });
    }
};

exports.addEmploymentInfo = async (req, res) => {
    try {
        const employmentData = {
            UserID: req.body.UserID,
            AnnualSalary: req.body.AnnualSalary,
            SalaryGradeStep: req.body.SalaryGradeStep,
            RatePerHour: req.body.RatePerHour,
            DateOfLastPromotion: req.body.DateOfLastPromotion,
            InitialYearOfTeaching: req.body.InitialYearOfTeaching
        };

        // Check if employment info already exists
        const existingInfo = await EmploymentInformation.findOne({
            where: { UserID: req.body.UserID }
        });

        if (existingInfo) {
            return res.status(400).json({ 
                message: 'Employment information already exists for this user' 
            });
        }

        const newEmploymentInfo = await EmploymentInformation.create(employmentData);
        res.status(201).json(newEmploymentInfo);
    } catch (error) {
        console.error('Error adding employment information:', error);
        res.status(500).json({ message: 'Error adding employment information' });
    }
};

exports.deleteEmploymentInfo = async (req, res) => {
    try {
        const { userId } = req.params;
        const employmentInfo = await EmploymentInformation.findOne({
            where: { UserID: userId }
        });

        if (!employmentInfo) {
            return res.status(404).json({ message: 'Employment information not found' });
        }

        await employmentInfo.destroy();
        res.status(200).json({ message: 'Employment information deleted successfully' });
    } catch (error) {
        console.error('Error deleting employment information:', error);
        res.status(500).json({ message: 'Error deleting employment information' });
    }
};

// Utility function to validate employment data
exports.validateEmploymentData = (employmentData) => {
    const errors = [];

    if (employmentData.AnnualSalary && employmentData.AnnualSalary < 0) {
        errors.push('Annual salary cannot be negative');
    }

    if (employmentData.RatePerHour && employmentData.RatePerHour < 0) {
        errors.push('Rate per hour cannot be negative');
    }

    if (employmentData.InitialYearOfTeaching) {
        const currentYear = new Date().getFullYear();
        if (employmentData.InitialYearOfTeaching > currentYear) {
            errors.push('Initial year of teaching cannot be in the future');
        }
    }

    return errors;
};
