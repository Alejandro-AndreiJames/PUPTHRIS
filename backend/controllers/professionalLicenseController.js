const ProfessionalLicense = require('../models/professionalLicenseModel');

// Get professional licenses
exports.getProfessionalLicenses = async (req, res) => {
    try {
        const userId = req.params.userId;
        const where = userId ? { UserID: userId } : {};
        
        const licenses = await ProfessionalLicense.findAll({
            where,
            order: [['YearObtained', 'DESC']]
        });

        res.status(200).json(licenses);
    } catch (error) {
        console.error('Error fetching professional licenses:', error);
        res.status(500).json({ message: 'Error fetching professional licenses', error: error.message });
    }
};

// Add a new professional license
exports.addProfessionalLicense = async (req, res) => {
    try {
        const licenseData = {
            UserID: req.body.UserID,
            ProfessionalLicenseEarned: req.body.ProfessionalLicenseEarned,
            YearObtained: req.body.YearObtained,
            ExpirationDate: req.body.ExpirationDate,
            AnnualSalary: req.body.AnnualSalary,
            SalaryGradeStep: req.body.SalaryGradeStep,
            RatePerHour: req.body.RatePerHour,
            DateOfLastPromotion: req.body.DateOfLastPromotion,
            InitialYearOfTeaching: req.body.InitialYearOfTeaching
        };

        const newLicense = await ProfessionalLicense.create(licenseData);
        res.status(201).json(newLicense);
    } catch (error) {
        console.error('Error creating professional license:', error);
        res.status(500).json({ message: 'Error creating professional license', error: error.message });
    }
};

// Update a professional license
exports.updateProfessionalLicense = async (req, res) => {
    try {
        const licenseId = req.params.id;
        const license = await ProfessionalLicense.findByPk(licenseId);

        if (!license) {
            return res.status(404).json({ message: 'Professional license not found' });
        }

        const updatedLicense = await license.update(req.body);
        res.status(200).json(updatedLicense);
    } catch (error) {
        console.error('Error updating professional license:', error);
        res.status(500).json({ message: 'Error updating professional license', error: error.message });
    }
};

// Delete a professional license
exports.deleteProfessionalLicense = async (req, res) => {
    try {
        const licenseId = req.params.id;
        const license = await ProfessionalLicense.findByPk(licenseId);

        if (!license) {
            return res.status(404).json({ message: 'Professional license not found' });
        }

        await license.destroy();
        res.status(200).json({ message: 'Professional license deleted successfully' });
    } catch (error) {
        console.error('Error deleting professional license:', error);
        res.status(500).json({ message: 'Error deleting professional license', error: error.message });
    }
}; 