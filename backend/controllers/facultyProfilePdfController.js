const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');
require('jspdf-autotable');
const User = require('../models/userModel');
const Department = require('../models/departmentModel');
const PersonalDetails = require('../models/personalDetailsModel');
const BasicDetails = require('../models/basicDetailsModel');

const generateFacultyProfilePdf = async (req, res) => {
    try {
        console.log('Starting PDF generation process...');

        // Fetch all users
        console.log('Fetching data for all users...');
        const users = await User.findAll({
            distinct: true,
            include: [{
                model: Department,
                as: 'Department',
                attributes: ['DepartmentName']
            },
            {
                model: PersonalDetails,
                as: 'personalDetails',
                attributes: ['CivilStatus']
            },
            {
                model: BasicDetails,
                attributes: ['FacultyCode', 'FirstName', 'LastName', 'MiddleInitial', 'DateOfBirth']
            }],
            order: [
                [{ model: BasicDetails }, 'LastName', 'ASC']
            ]
        });

        // Filter out duplicates based on UserID
        const uniqueUsers = Array.from(new Map(users.map(user => [user.UserID, user])).values());
        
        console.log(`Found ${uniqueUsers.length} unique users after filtering`);

        // Log each unique user
        uniqueUsers.forEach(user => {
            console.log(`Processing UserID: ${user.UserID} - Name: ${user.BasicDetail?.LastName}, ${user.BasicDetail?.FirstName}`);
        });

        if (!uniqueUsers.length) {
            throw new Error('No faculty members found');
        }

        // Format the data with null handling using uniqueUsers
        console.log('Formatting users data...');
        const facultyData = uniqueUsers.map((user, index) => {
            console.log(`Creating row ${index + 1} for UserID: ${user.UserID}`);
            return [
                (index + 1).toString(),
                user.BasicDetail?.FacultyCode || '',
                `${user.BasicDetail?.LastName || ''}, ${user.BasicDetail?.FirstName || ''} ${user.BasicDetail?.MiddleInitial || ''}`,
                user.Department?.DepartmentName || '',
                user.personalDetails?.CivilStatus || '',
                user.BasicDetail?.DateOfBirth ? new Date(user.BasicDetail.DateOfBirth).toLocaleDateString() : '',
                user.EmploymentType || ''
            ];
        });

        // Initialize PDF document
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'in',
            format: 'legal'
        });

        // Add header only on first page
        doc.setFont('times', 'normal');

        // Add PUP Logo
        const logoPath = path.join(__dirname, '../assets/PUPLogo.png');
        const logoData = fs.readFileSync(logoPath);
        const logoBase64 = logoData.toString('base64');

        const logoPath2 = path.join(__dirname, '../assets/BagongPilipinas.png');
        const logoData2 = fs.readFileSync(logoPath2);
        const logoBase642 = logoData2.toString('base64');

        doc.addImage(
            `data:image/png;base64,${logoBase64}`,
            'PNG',
            0.5,
            0.5,
            1,
            1
        );

        doc.addImage(
            `data:image/png;base64,${logoBase642}`,
            'PNG',
            12,
            0.4,
            1,
            1
        );

        const textStartX = 1.75;
        
        doc.setFontSize(10);
        doc.text('Republic of the Philippines', textStartX, 0.7);
        
        doc.setFontSize(12);
        doc.setFont('times', 'bold');
        doc.text('POLYTECHNIC UNIVERSITY OF THE PHILIPPINES', textStartX, 0.9);
        
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        doc.text('Office of the Vice President for Branches and Campuses', textStartX, 1.1);
        
        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        doc.text('TAGUIG CAMPUS', textStartX, 1.3);
        
        doc.setLineWidth(0.01);
        doc.line(0.5, 1.7, 13, 1.7);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('FACULTY PROFILING SHEET', doc.internal.pageSize.width/2, 2, { align: 'center' });

        // Add the table with automatic pagination
        doc.autoTable({
            startY: 2.2,
            margin: { left: 0.5, right: 0.5 },
            headStyles: {
                fillColor: false,
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.01,
                lineColor: [0, 0, 0]
            },
            head: [
                [{ content: 'I. PERSONAL INFORMATION', colSpan: 7, styles: { halign: 'left' } }],
                ['#', 'FACULTY CODE', 'NAME', 'DEPARTMENT', 'CIVIL STATUS', 'DATE OF BIRTH', 'EMPLOYMENT STATUS']
            ],
            body: facultyData,
            styles: {
                fontSize: 8,
                cellPadding: 0.05,
                lineWidth: 0.01,
                lineColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 0.5 },    // #
                1: { cellWidth: 1.8 },    // Faculty Code
                2: { cellWidth: 2.5 },    // Name
                3: { cellWidth: 2.5 },    // Department
                4: { cellWidth: 1.7 },    // Civil Status
                5: { cellWidth: 1.7 },    // Date of Birth
                6: { cellWidth: 2.3 }     // Employment Status
            },
            theme: 'grid'
        });

        // Generate and send PDF
        const pdfBuffer = doc.output('arraybuffer');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=faculty-profile.pdf');
        res.send(Buffer.from(pdfBuffer));

        console.log('PDF generation completed successfully');

    } catch (error) {
        console.error('Error in generateFacultyProfilePdf:', error);
        res.status(500).json({ 
            message: 'Error generating PDF',
            error: error.message,
            stack: error.stack 
        });
    }
};

module.exports = {
    generateFacultyProfilePdf
};
