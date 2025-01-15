const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');
require('jspdf-autotable');
const User = require('../models/userModel');
const Department = require('../models/departmentModel');
const PersonalDetails = require('../models/personalDetailsModel');
const BasicDetails = require('../models/basicDetailsModel');
const Education = require('../models/educationModel');
const ProfessionalLicense = require('../models/professionalLicenseModel');
const EmploymentInformation = require('../models/employmentInformationModel');
const AcademicRank = require('../models/academicRanksModel');

const mapEmploymentStatus = (status) => {
    if (!status) return 'N/A';
    
    const statusMap = {
        'parttime': 'Part-time',
        'designee': 'Designee',
        'temporary': 'Temporary',
        'fulltime': 'Full-time'
    };

    return statusMap[status.toLowerCase()] || 'N/A';
};

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
            return [
                (index + 1).toString(),
                user.BasicDetail?.FacultyCode || 'N/A',
                `${user.BasicDetail?.LastName || 'N/A'}, ${user.BasicDetail?.FirstName || 'N/A'} ${user.BasicDetail?.MiddleInitial || ''}`,
                user.Department?.DepartmentName || 'N/A',
                user.personalDetails?.CivilStatus || 'N/A',
                user.BasicDetail?.DateOfBirth ? new Date(user.BasicDetail.DateOfBirth).toLocaleDateString() : 'N/A',
                mapEmploymentStatus(user.EmploymentType)
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
                fillColor: [169, 169, 169],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.01,
                lineColor: [0, 0, 0],
                halign: 'center'
            },
            bodyStyles: {
                textColor: [0, 0, 0],
                fontStyle: 'normal'
            },
            head: [
                [{ content: 'I. PERSONAL INFORMATION', colSpan: 7, styles: { halign: 'left', fillColor: [211, 211, 211] } }],
                [
                    { content: '#', styles: { halign: 'center' } },
                    { content: 'FACULTY CODE', styles: { halign: 'center' } },
                    { content: 'NAME', styles: { halign: 'center' } },
                    { content: 'DEPARTMENT', styles: { halign: 'center' } },
                    { content: 'CIVIL STATUS', styles: { halign: 'center' } },
                    { content: 'DATE OF BIRTH', styles: { halign: 'center' } },
                    { content: 'EMPLOYMENT STATUS', styles: { halign: 'center' } }
                ]
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

        // After the first table (personal info), add educational background for Bachelors
        doc.addPage();

        // Fetch educational background for all users (Bachelors only)
        const educationData = await Promise.all(uniqueUsers.map(async (user, index) => {
            const education = await Education.findAll({
                where: {
                    UserID: user.UserID,
                    Level: 'Bachelors Degree'  // Filter for Bachelors degrees only
                }
            });
            
            // If no education records found, return one row with N/A
            if (education.length === 0) {
                return [[
                    (index + 1).toString(),
                    'N/A',
                    'N/A',
                    'N/A'
                ]];
            }
            
            // If education records exist, map them maintaining the same index
            return education.map(edu => [
                (index + 1).toString(),
                edu.Course || 'N/A',
                edu.NameOfSchool || 'N/A',
                edu.YearGraduated || 'N/A'
            ]);
        }));

        // Flatten the array of arrays
        const flatEducationData = educationData.flat();

        // Add the education table
        doc.autoTable({
            startY: 1,
            margin: { left: 0.5, right: 0.5 },
            headStyles: {
                fillColor: [169, 169, 169],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.01,
                lineColor: [0, 0, 0],
                halign: 'center'
            },
            bodyStyles: {
                textColor: [0, 0, 0],
                fontStyle: 'normal'
            },
            head: [
                [{ content: 'II. EDUCATIONAL BACKGROUND', colSpan: 4, styles: { halign: 'left', fillColor: [211, 211, 211] } }],
                [{ content: "BACHELOR'S DEGREE", colSpan: 4, styles: { halign: 'left' } }],
                [
                    { content: '#', styles: { halign: 'center' } },
                    { content: 'COURSE TAKEN', styles: { halign: 'center' } },
                    { content: 'COLLEGE/UNIVERSITY', styles: { halign: 'center' } },
                    { content: 'YEAR GRADUATED', styles: { halign: 'center' } }
                ]
            ],
            body: flatEducationData,
            styles: {
                fontSize: 8,
                cellPadding: 0.05,
                lineWidth: 0.01,
                lineColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 0.5 },     // #
                1: { cellWidth: 4.5 },       // Course
                2: { cellWidth: 4.5 },       // School
                3: { cellWidth: 3.5 }      // Year
            },
            theme: 'grid'
        });

        doc.addPage();

        // After Bachelor's table, add Master's degree data
        const masterEducationData = await Promise.all(uniqueUsers.map(async (user, index) => {
            const education = await Education.findAll({
                where: {
                    UserID: user.UserID,
                    Level: 'Masters'  // Filter for Masters degrees
                }
            });
            
            if (education.length === 0) {
                return [[
                    (index + 1).toString(),
                    'N/A',
                    'N/A',
                    'N/A',
                    'N/A',
                    'N/A',
                    'N/A'
                ]];
            }
            
            return education.map(edu => [
                (index + 1).toString(),
                edu.Course || 'N/A',
                edu.NameOfSchool || 'N/A',
                edu.MeansOfEducationSupport || 'N/A',
                edu.FundingAgency || 'N/A',
                edu.DurationOfFundingSupport || 'N/A',
                edu.YearGraduated || 'N/A'
            ]);
        }));

        const flatMasterEducationData = masterEducationData.flat();

        // Add the Master's education table
        doc.autoTable({
            startY: 1,
            margin: { left: 0.5, right: 0.5 },
            headStyles: {
                fillColor: [169, 169, 169],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.01,
                lineColor: [0, 0, 0]
            },
            bodyStyles: {
                textColor: [0, 0, 0],
                fontStyle: 'normal'
            },
            head: [
                [{ content: "MASTER'S DEGREE", colSpan: 6, styles: { halign: 'left', fillColor: [211, 211, 211] } }],
                [
                    { content: '#', styles: { halign: 'center' } },
                    { content: "MASTER'S DEGREE", styles: { halign: 'center' } },
                    { content: 'COLLEGE/UNIVERSITY', styles: { halign: 'center' } },
                    { content: 'MEANS OF EDUCATION SUPPORT', styles: { halign: 'center' } },
                    { content: 'FUNDING AGENCY', styles: { halign: 'center' } },
                    { content: 'YEAR GRADUATED', styles: { halign: 'center' } }
                ]
            ],
            body: flatMasterEducationData.map(row => [
                row[0],          // #
                row[1],          // Master's Degree
                row[2],          // College/University
                row[3],          // Means of Education
                row[4],          // Funding Agency
                row[6]           // Year Graduated (removed Duration)
            ]),
            styles: {
                fontSize: 8,
                cellPadding: 0.05,
                lineWidth: 0.01,
                lineColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 0.5 },      // #
                1: { cellWidth: 2.5 },      // Master's Degree
                2: { cellWidth: 3 },      // College/University
                3: { cellWidth: 3 },      // Means of Education
                4: { cellWidth: 2.5 },      // Funding Agency
                5: { cellWidth: 1.5 }       // Year Graduated
            },
            theme: 'grid'
        });

        // After the first table (personal info), add educational background for Bachelors
        doc.addPage();

        // Fetch Doctoral education data first
        const doctoralEducationData = await Promise.all(uniqueUsers.map(async (user, index) => {
            const education = await Education.findAll({
                where: {
                    UserID: user.UserID,
                    Level: 'Doctoral'  // Filter for Doctoral degrees
                }
            });
            
            if (education.length === 0) {
                return [[
                    (index + 1).toString(),
                    'N/A',
                    'N/A',
                    'N/A',
                    'N/A',
                    'N/A',
                    'N/A',
                    'N/A'
                ]];
            }
            
            return education.map(edu => [
                (index + 1).toString(),
                edu.Course || 'N/A',
                edu.NameOfSchool || 'N/A',
                edu.MeansOfEducationSupport || 'N/A',
                edu.FundingAgency || 'N/A',
                edu.DurationOfFundingSupport || 'N/A',
                edu.UnitsEarned || 'N/A',
                edu.YearGraduated || 'N/A'
            ]);
        }));

        const flatDoctoralEducationData = doctoralEducationData.flat();

        // Then create the Doctoral table with the fetched data
        doc.autoTable({
            startY: 1,
            margin: { left: 0.5, right: 0.5 },
            headStyles: {
                fillColor: [169, 169, 169],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.01,
                lineColor: [0, 0, 0]
            },
            bodyStyles: {
                textColor: [0, 0, 0],
                fontStyle: 'normal'
            },
            head: [
                [{ content: 'DOCTORAL DEGREE', colSpan: 8, styles: { halign: 'left', fillColor: [211, 211, 211] } }],
                [
                    { content: '#', styles: { halign: 'center' } },
                    { content: 'DOCTORAL DEGREE', styles: { halign: 'center' } },
                    { content: 'COLLEGE/UNIVERSITY', styles: { halign: 'center' } },
                    { content: 'MEANS OF EDUCATION SUPPORT', styles: { halign: 'center' } },
                    { content: 'FUNDING AGENCY', styles: { halign: 'center' } },
                    { content: 'DURATION', styles: { halign: 'center' } },
                    { content: 'UNITS EARNED', styles: { halign: 'center' } },
                    { content: 'YEAR GRADUATED', styles: { halign: 'center' } }
                ]
            ],
            body: flatDoctoralEducationData,  // Use the fetched data instead of empty values
            styles: {
                fontSize: 8,
                cellPadding: 0.05,
                lineWidth: 0.01,
                lineColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 0.5 },      // #
                1: { cellWidth: 1.5 },        // Doctoral Degree
                2: { cellWidth: 2.5 },        // College/University
                3: { cellWidth: 2.5 },      // Means of Education
                4: { cellWidth: 2 },        // Funding Agency
                5: { cellWidth: 1.5 },      // Duration
                6: { cellWidth: 1 },      // Units Earned
                7: { cellWidth: 1.5 }       // Year Graduated
            },
            theme: 'grid'
        });

        // After the first table (personal info), add educational background for Bachelors
        doc.addPage();

        // Fetch Professional License data
        const professionalLicenseData = await Promise.all(uniqueUsers.map(async (user, index) => {
            const licenses = await ProfessionalLicense.findAll({
                where: {
                    UserID: user.UserID
                }
            });
            
            if (licenses.length === 0) {
                return [[
                    (index + 1).toString(),
                    'N/A',
                    'N/A',
                    'N/A'
                ]];
            }
            
            return licenses.map(license => [
                (index + 1).toString(),
                license.ProfessionalLicenseEarned || 'N/A',
                license.YearObtained?.toString() || 'N/A',
                license.ExpirationDate ? new Date(license.ExpirationDate).toLocaleDateString() : 'N/A'
            ]);
        }));

        const flatProfessionalLicenseData = professionalLicenseData.flat();

        // Add Professional License table
        doc.autoTable({
            startY: 1,
            margin: { left: 0.5, right: 0.5 },
            headStyles: {
                fillColor: [169, 169, 169],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.01,
                lineColor: [0, 0, 0]
            },
            bodyStyles: {
                textColor: [0, 0, 0],
                fontStyle: 'normal'
            },
            head: [
                [{ content: 'III. PROFESSIONAL CREDENTIALS', colSpan: 4, styles: { halign: 'left', fillColor: [211, 211, 211] } }],
                [
                    { content: '#', styles: { halign: 'center' } },
                    { content: 'PROFESSIONAL LICENSE EARNED', styles: { halign: 'center' } },
                    { content: 'YEAR OBTAINED', styles: { halign: 'center' } },
                    { content: 'EXPIRATION DATE', styles: { halign: 'center' } }
                ]
            ],
            body: flatProfessionalLicenseData,
            styles: {
                fontSize: 8,
                cellPadding: 0.05,
                lineWidth: 0.01,
                lineColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 0.5 },      // #
                1: { cellWidth: 5 },        // Professional License
                2: { cellWidth: 4 },        // Year Obtained
                3: { cellWidth: 3.5 }         // Expiration Date
            },
            theme: 'grid'
        });

        // After the first table (personal info), add educational background for Bachelors
        doc.addPage();

        // Fetch Employment Information data with Academic Rank
        const employmentData = await Promise.all(uniqueUsers.map(async (user, index) => {
            const employment = await EmploymentInformation.findOne({
                where: {
                    UserID: user.UserID
                }
            });
            
            const academicRank = await AcademicRank.findOne({
                where: {
                    UserID: user.UserID
                }
            });
            
            const formatCurrency = (amount) => {
                if (!amount) return 'N/A';
                // Remove the ± symbol if present and convert to number
                const cleanAmount = amount.toString().replace('±', '');
                const value = Number(cleanAmount);
                const formattedSalary = `P ${value.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;
                return formattedSalary;
            };
            
            return [[
                (index + 1).toString(),
                academicRank?.Rank || 'N/A',
                formatCurrency(employment?.AnnualSalary),
                employment?.SalaryGradeStep || 'N/A',
                formatCurrency(employment?.RatePerHour),
                employment?.DateOfLastPromotion ? new Date(employment.DateOfLastPromotion).toLocaleDateString() : 'N/A',
                employment?.InitialYearOfTeaching?.toString() || 'N/A'
            ]];
        }));

        const flatEmploymentData = employmentData.flat();

        // Add Employment Details table
        doc.autoTable({
            startY: 1,
            margin: { left: 0.5, right: 0.5 },
            headStyles: {
                fillColor: [169, 169, 169],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.01,
                lineColor: [0, 0, 0]
            },
            bodyStyles: {
                textColor: [0, 0, 0],
                fontStyle: 'normal'
            },
            head: [
                [{ content: 'IV. EMPLOYMENT DETAILS', colSpan: 7, styles: { halign: 'left', fillColor: [211, 211, 211] } }],
                    [
                        { content: '#', styles: { halign: 'center' } },
                        { content: 'RANK', styles: { halign: 'center' } },
                        { content: 'ANNUAL SALARY', styles: { halign: 'center' } },
                        { content: 'SALARY GRADE', styles: { halign: 'center' } },
                        { content: 'RATE PER HOUR', styles: { halign: 'center' } },
                        { content: 'DATE OF LAST PROMOTION', styles: { halign: 'center' } },
                        { content: 'INITIAL YEAR OF TEACHING', styles: { halign: 'center' } }
                    ]
            ],
            body: flatEmploymentData,
            styles: {
                fontSize: 8,
                cellPadding: 0.05,
                lineWidth: 0.01,
                lineColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 0.5 },      // #
                1: { cellWidth: 3 },        // Rank
                2: { cellWidth: 2.5 },      // Annual Salary
                3: { cellWidth: 2.5 },      // Salary Grade
                4: { cellWidth: 2 },        // Rate per Hour
                5: { cellWidth: 1.5 },      // Date of Last Promotion
                6: { cellWidth: 1 }       // Initial Year of Teaching
            },
            theme: 'grid'
        });

        
        const logoPath3 = path.join(__dirname, '../assets/stamp.jpg');
        const logoData3 = fs.readFileSync(logoPath3);
        const logoBase643 = logoData3.toString('base64');
    
        // Function to add footer
        const addFooter = (doc) => {
            // Set starting Y position near bottom of page
            const footerY = doc.internal.pageSize.height - 1; // 1 inch from bottom

            // Contact details in Helvetica 8pt
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('General Santos Ave., Lower Bicutan, Taguig City, Philippines 1632', 0.5, footerY);
            doc.text('Direct Line: (02) 8837 5858 to 60', 0.5, footerY + 0.15);
            
            // Website and email with hyperlink styling
            doc.text('Website: ', 0.5, footerY + 0.3);
            doc.setTextColor(0, 0, 255); // Blue color for links
            doc.text('www.pup.edu.ph', 0.9, footerY + 0.3);
            doc.setTextColor(0); // Reset to black
            doc.text(' | Email: ', 1.8, footerY + 0.3);
            doc.setTextColor(0, 0, 255);
            doc.text('taguig@pup.edu.ph', 2.3, footerY + 0.3);
            doc.setTextColor(0);

            // The Country's 1st Polytechnicu in Times New Roman 15pt
            doc.setFont('times', 'normal');
            doc.setFontSize(15);
            doc.text('THE COUNTRY\'S 1st POLYTECHNICU', 0.5, footerY + 0.5);


            // Add stamp
            doc.addImage(
                `data:image/jpg;base64,${logoBase643}`,
                'JPEG',
                10,
                footerY - 0.4,
                2.8,
                1.13
            );
        };

        // After your table generation code, check if there's enough space for the footer
        const finalY = doc.lastAutoTable.finalY || doc.internal.pageSize.height - 3;
        const requiredSpace = 2.5; // Approximate space needed for footer in inches

        if (finalY + requiredSpace > doc.internal.pageSize.height - 0.5) {
            // Not enough space, add new page
            doc.addPage();
        }

        // Add the footer
        addFooter(doc);

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
