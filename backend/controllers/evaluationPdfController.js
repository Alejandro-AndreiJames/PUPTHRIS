const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');
require('jspdf-autotable');

exports.generateEvaluationPdf = async (req, res) => {
  try {
    // Initialize PDF document with legal size paper (8.5 x 14 inches)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'legal'
    });
    
    // Set font to Times New Roman
    doc.setFont('times', 'normal');

    // Add PUP Logo
    const logoPath = path.join(__dirname, '../assets/PUPLogo.png');
    const logoData = fs.readFileSync(logoPath);
    const logoBase64 = logoData.toString('base64');

    const logoPath2 = path.join(__dirname, '../assets/BagongPilipinas.png');
    const logoData2 = fs.readFileSync(logoPath2);
    const logoBase642 = logoData2.toString('base64');

    const logoPath3 = path.join(__dirname, '../assets/stamp.jpg');
    const logoData3 = fs.readFileSync(logoPath3);
    const logoBase643 = logoData3.toString('base64');
    
    // Add left logo
    doc.addImage(
      `data:image/png;base64,${logoBase64}`,
      'PNG',
      0.5,  // x position (0.5 inches from left)
      0.5,  // y position (0.5 inches from top)
      1,    // width (1 inch)
      1     // height (1 inch)
    );

    // Add right logo
    doc.addImage(
      `data:image/png;base64,${logoBase642}`,
      'PNG',
      7,  // x position (6.5 inches from left - near right margin)
      0.4,  // y position (0.5 inches from top)
      1,    // width (1 inch)
      1     // height (1 inch)
    );

    // Text aligned with logo (converted to inches)
    const textStartX = 1.75; // Position text after left logo

    // Add Header text
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
    
    // Add horizontal line
    doc.setLineWidth(0.01); // Set line width
    doc.line(0.5, 1.7, 8, 1.7); // Draw line (x1, y1, x2, y2)
    
    // Title (centered)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('CLASSROOM EVALUATION TOOL', doc.internal.pageSize.width/2, 2, { align: 'center' });
    
    // Basic Information Table - Simple 2-column layout
    doc.autoTable({
      startY: 2.3,
      margin: { left: 0.5, right: 0.5 },
      styles: {
        fontSize: 10,
        lineWidth: 0.01,
        cellPadding: 0.10,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 3.5 },  // Left column
        1: { cellWidth: 4 }   // Right column
      },
      body: [
        ['Faculty Name: Test Name', 'Date of Classroom Observation: 2024-01-01'],
        ['School Year and Semester: 2024-2025 1st Semester', 'Class Section: BIST 4-1'],
        ['Course/Subject: Test Subject', 'Overall Rating: 89.0']
      ],
      theme: 'plain'
    });

    // Rating Scale Table
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 0.20,
      margin: { left: 0.5, right: 0.5 },
      styles: {
        fontSize: 10,
        lineWidth: 0.01,
        cellPadding: 0.03,
        lineColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 1, halign: 'center' },
        1: { cellWidth: 1.3, halign: 'center' },
        2: { cellWidth: 1.3, halign: 'center' },
        3: { cellWidth: 1.3, halign: 'center' },
        4: { cellWidth: 1.3, halign: 'center' },
        5: { cellWidth: 1.3, halign: 'center' }
      },
      body: [
        ['Scale', '1', '2', '3', '4', '5'],
        ['Range', '20 to 30.9999', '31 to 50.9999', '51 to 70.9999', '71 to 90.9999', '91 to 100'],
        ['Qualitative Description', 'Poor\n(P)', 'Fair\n(F)', 'Satisfactory\n(S)', 'Very Satisfactory(VS)', 'Outstanding\n(O)']
      ],
      theme: 'plain'
    });

    // Classroom Observation Criteria Table
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 0.01,
      margin: { left: 0.5, right: 0.5 },
      styles: {
        fontSize: 10,
        lineWidth: 0.01,
        cellPadding: 0.10,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 6 },    // Wider column for criteria
        1: { cellWidth: 1.5, halign: 'center' }   // Center the "Rating" column
      },
      body: [
        [{content: "Classroom Observation Criteria", styles: {fontStyle: "bold"}}, {content: "Rating", styles: {fontStyle: "bold"}}],
        ['1. Instruction and discussion facilitation refer to sharing control and direction with students.', ''],
        ['2. Commitment refers to the course specialist act or quality of fulfilling responsibility giving the dedication, discipline, maturity for the learners development and advancement', ''],
        ['3. Teaching for independent learning pertains to the course specialist\'s ability to organize teaching-learning process to enable learners to maximize their potentials', ''],
        ['4. Use of instructional materials and other educational resources to help maximize learning', ''],
        ['5. Classroom climate and virtual community referring to facilitating collaborative and effective interaction.', ''],
        ['6. Course organization referring to objectives, concepts, examples, and program fragments discussed in class.', ''],
        ['7. Assessments referring to the activities required in the course to assess the competence of the students.', ''],
        [{ content: 'Average', styles: { halign: 'right' } }, ''],
        [{ content: 'Qualitative Description', styles: { halign: 'right' } }, '']
      ],
      theme: 'plain'
    });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Source: PUP Evaluation Matrix', 0.5, doc.lastAutoTable.finalY + 0.20);

    doc.text('Comments:', 0.5, doc.lastAutoTable.finalY + 0.80);




    // Add footer text
    // Set starting Y position near bottom of page
    const footerY = doc.internal.pageSize.height - 1; // 2 inches from bottom

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

    doc.addImage(
        `data:image/jpg;base64,${logoBase643}`,
        'JPEG',
        5,  // x position (moved left to accommodate wider width)
        footerY - 0.4,  // y position (aligned with footer text)
        2.8,    // width (7.11 cm ≈ 2.8 inches)
        1.13    // height (2.88 cm ≈ 1.13 inches)
    );

    // Send the PDF as response
    const pdfBuffer = doc.output('arraybuffer');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=classroom_evaluation.pdf');
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      error: 'Error generating PDF',
      details: error.message 
    });
  }
};
