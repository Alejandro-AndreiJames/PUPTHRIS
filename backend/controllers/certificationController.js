const Certification = require('../models/certificationModel');

exports.getCertifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const certifications = await Certification.findAll({
            where: { UserID: userId }
        });
        res.status(200).json(certifications);
    } catch (error) {
        console.error('Error fetching certifications:', error);
        res.status(500).json({ message: 'Error fetching certifications' });
    }
};

exports.addCertification = async (req, res) => {
    try {
        const certificationData = {
            UserID: req.body.UserID,
            Name: req.body.Name,
            IssuingOrganization: req.body.IssuingOrganization,
            IssueDate: req.body.IssueDate,
            ExpirationDate: req.body.ExpirationDate,
            CredentialID: req.body.CredentialID,
            CredentialURL: req.body.CredentialURL
        };

        const newCertification = await Certification.create(certificationData);
        res.status(201).json(newCertification);
    } catch (error) {
        console.error('Error adding certification:', error);
        res.status(500).json({ message: 'Error adding certification' });
    }
};

exports.updateCertification = async (req, res) => {
    try {
        const { id } = req.params;
        const certificationData = {
            Name: req.body.Name,
            IssuingOrganization: req.body.IssuingOrganization,
            IssueDate: req.body.IssueDate,
            ExpirationDate: req.body.ExpirationDate,
            CredentialID: req.body.CredentialID,
            CredentialURL: req.body.CredentialURL
        };

        const certification = await Certification.findByPk(id);
        
        if (!certification) {
            return res.status(404).json({ message: 'Certification not found' });
        }

        await certification.update(certificationData);
        
        const updatedCertification = await Certification.findByPk(id);
        res.status(200).json(updatedCertification);
    } catch (error) {
        console.error('Error updating certification:', error);
        res.status(500).json({ message: 'Error updating certification' });
    }
};

exports.deleteCertification = async (req, res) => {
    try {
        const { id } = req.params;
        const certification = await Certification.findByPk(id);
        
        if (!certification) {
            return res.status(404).json({ message: 'Certification not found' });
        }

        await certification.destroy();
        res.status(200).json({ message: 'Certification deleted successfully' });
    } catch (error) {
        console.error('Error deleting certification:', error);
        res.status(500).json({ message: 'Error deleting certification' });
    }
};
