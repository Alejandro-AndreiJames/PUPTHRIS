const ProfessionalLicense = require('../models/professionalLicenseModel');

exports.getLicensesByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const licenses = await ProfessionalLicense.findAll({
            where: { UserID: userId }
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

        const license = await ProfessionalLicense.create(licenseData);
        res.status(201).json(license);
    } catch (error) {
        console.error('Error adding license:', error);
        res.status(500).json({ message: 'Error adding professional license' });
    }
};

exports.updateLicense = async (req, res) => {
    try {
        const { id } = req.params;
        const licenseData = {
            ProfessionalLicenseEarned: req.body.ProfessionalLicenseEarned,
            YearObtained: req.body.YearObtained,
            ExpirationDate: req.body.ExpirationDate
        };

        const license = await ProfessionalLicense.findByPk(id);
        
        if (!license) {
            return res.status(404).json({ message: 'License not found' });
        }

        await license.update(licenseData);
        const updatedLicense = await ProfessionalLicense.findByPk(id);
        res.status(200).json(updatedLicense);
    } catch (error) {
        console.error('Error updating license:', error);
        res.status(500).json({ message: 'Error updating professional license' });
    }
};

exports.deleteLicense = async (req, res) => {
    try {
        const { id } = req.params;
        const license = await ProfessionalLicense.findByPk(id);
        
        if (!license) {
            return res.status(404).json({ message: 'License not found' });
        }

        await license.destroy();
        res.status(200).json({ message: 'License deleted successfully' });
    } catch (error) {
        console.error('Error deleting license:', error);
        res.status(500).json({ message: 'Error deleting professional license' });
    }
}; 