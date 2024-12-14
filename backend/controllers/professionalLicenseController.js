const ProfessionalLicense = require('../models/professionalLicenseModel');
const EmploymentInformation = require('../models/employmentInformationModel');

exports.getLicensesByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const licenses = await ProfessionalLicense.findAll({
            where: { UserID: userId },
            include: [{
                model: EmploymentInformation,
                attributes: ['AnnualSalary', 'SalaryGradeStep', 'RatePerHour', 'DateOfLastPromotion', 'InitialYearOfTeaching']
            }]
        });
        res.status(200).json(licenses);
    } catch (error) {
        console.error('Error fetching licenses:', error);
        res.status(500).json({ message: 'Error fetching professional licenses' });
    }
};

exports.addLicense = async (req, res) => {
    try {
        const licenseData = {
            UserID: req.body.UserID,
            ProfessionalLicenseEarned: req.body.ProfessionalLicenseEarned,
            YearObtained: req.body.YearObtained,
            ExpirationDate: req.body.ExpirationDate
        };

        const employmentData = {
            UserID: req.body.UserID,
            AnnualSalary: req.body.AnnualSalary,
            SalaryGradeStep: req.body.SalaryGradeStep,
            RatePerHour: req.body.RatePerHour,
            DateOfLastPromotion: req.body.DateOfLastPromotion,
            InitialYearOfTeaching: req.body.InitialYearOfTeaching
        };

        const license = await ProfessionalLicense.create(licenseData);
        await EmploymentInformation.create(employmentData);

        const completeData = await ProfessionalLicense.findOne({
            where: { LicenseID: license.LicenseID },
            include: [EmploymentInformation]
        });

        res.status(201).json(completeData);
    } catch (error) {
        console.error('Error adding license:', error);
        res.status(500).json({ message: 'Error adding professional license' });
    }
};

exports.updateLicense = async (req, res) => {
    try {
        const { licenseId } = req.params;
        const licenseData = {
            ProfessionalLicenseEarned: req.body.ProfessionalLicenseEarned,
            YearObtained: req.body.YearObtained,
            ExpirationDate: req.body.ExpirationDate
        };

        const employmentData = {
            AnnualSalary: req.body.AnnualSalary,
            SalaryGradeStep: req.body.SalaryGradeStep,
            RatePerHour: req.body.RatePerHour,
            DateOfLastPromotion: req.body.DateOfLastPromotion,
            InitialYearOfTeaching: req.body.InitialYearOfTeaching
        };

        await ProfessionalLicense.update(licenseData, {
            where: { LicenseID: licenseId }
        });

        const license = await ProfessionalLicense.findByPk(licenseId);
        await EmploymentInformation.update(employmentData, {
            where: { UserID: license.UserID }
        });

        const updatedData = await ProfessionalLicense.findOne({
            where: { LicenseID: licenseId },
            include: [EmploymentInformation]
        });

        res.status(200).json(updatedData);
    } catch (error) {
        console.error('Error updating license:', error);
        res.status(500).json({ message: 'Error updating professional license' });
    }
};

exports.deleteLicense = async (req, res) => {
    try {
        const { licenseId } = req.params;
        const license = await ProfessionalLicense.findByPk(licenseId);
        
        if (!license) {
            return res.status(404).json({ message: 'License not found' });
        }

        // Delete associated employment information
        await EmploymentInformation.destroy({
            where: { UserID: license.UserID }
        });

        // Delete the license
        await license.destroy();

        res.status(200).json({ message: 'License and associated information deleted successfully' });
    } catch (error) {
        console.error('Error deleting license:', error);
        res.status(500).json({ message: 'Error deleting professional license' });
    }
}; 