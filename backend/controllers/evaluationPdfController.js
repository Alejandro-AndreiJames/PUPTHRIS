const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');
require('jspdf-autotable');
const FacultyEvaluation = require('../models/facultyEvaluationModel');
const User = require('../models/userModel');
const ObservationSchedule = require('../models/observationScheduleModel');
const EvaluationScore = require('../models/evaluationScoresModel');

const formatDate = (date) => {
  console.log('Formatting date:', date);
  if (!date) {
    console.log('No date provided');
    return 'N/A';
  }
  try {
    const formatted = new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    console.log('Formatted date:', formatted);
    return formatted;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

exports.generateEvaluationPdf = async (req, res) => {
  try {
    const { evaluationId } = req.params;
    console.log('Generating PDF for evaluationId:', evaluationId);

    // First find the evaluation with detailed logging
    const evaluation = await FacultyEvaluation.findOne({
      where: { EvaluationID: evaluationId },
      include: [
        {
          model: User,
          as: 'Faculty',
          attributes: ['UserID', 'FirstName', 'Surname']
        },
        {
          model: ObservationSchedule,
          as: 'ObservationSchedule',
          attributes: ['Subject', 'ScheduledDate', 'Topic', 'RoomNumber']
        }
      ]
    });

    console.log('Raw Evaluation Data:', JSON.stringify(evaluation, null, 2));

    if (!evaluation) {
      console.log('No evaluation found for ID:', evaluationId);
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    // Then find the matching observation schedule using faculty, year and semester
    const observationSchedule = await ObservationSchedule.findOne({
      where: { 
        FacultyID: evaluation.FacultyID,
        AcademicYear: evaluation.AcademicYear,
        Semester: evaluation.Semester
      },
      attributes: ['ScheduledDate', 'Subject', 'Topic', 'RoomNumber']
    });

    console.log('Raw Observation Schedule Data:', JSON.stringify(observationSchedule, null, 2));

    // Get evaluation scores with logging
    const evaluationScores = await EvaluationScore.findAll({
      where: { EvaluationID: evaluationId },
      order: [['CriteriaID', 'ASC']]
    });

    console.log('Raw Evaluation Scores:', JSON.stringify(evaluationScores, null, 2));

    // Create a map of criteria scores with logging
    const scoreMap = evaluationScores.reduce((map, score) => {
      map[score.CriteriaID] = score.Score;
      return map;
    }, {});

    console.log('Score Map:', scoreMap);

    // Log the evaluation data being used
    const evaluationData = {
      facultyName: evaluation?.Faculty ? `${evaluation.Faculty.FirstName} ${evaluation.Faculty.Surname}` : 'N/A',
      subject: evaluation?.ObservationSchedule?.Subject || observationSchedule?.Subject || 'N/A',
      observationDate: evaluation?.ObservationSchedule?.ScheduledDate 
        ? formatDate(evaluation.ObservationSchedule.ScheduledDate) 
        : observationSchedule?.ScheduledDate 
          ? formatDate(observationSchedule.ScheduledDate) 
          : 'N/A',
      courseSection: evaluation?.CourseSection || 'N/A',
      academicYear: evaluation?.AcademicYear || 'N/A',
      semester: evaluation?.Semester || 'N/A',
      totalScore: evaluation?.TotalScore || 'N/A',
      topic: evaluation?.ObservationSchedule?.Topic || observationSchedule?.Topic || 'N/A',
      roomNumber: evaluation?.ObservationSchedule?.RoomNumber || observationSchedule?.RoomNumber || 'N/A'
    };

    console.log('Processed Evaluation Data:', evaluationData);

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
        0: { cellWidth: 3.5 },
        1: { cellWidth: 4 }
      },
      body: [
        [
          `Faculty Name: ${evaluationData.facultyName}`,
          `Date of Classroom Observation: ${evaluationData.observationDate}`
        ],
        [
          `School Year and Semester: ${evaluationData.academicYear} ${evaluationData.semester}`,
          `Class Section: ${evaluationData.courseSection}`
        ],
        [
          `Course/Subject: ${evaluationData.subject}`,
          `Overall Rating: ${evaluationData.totalScore}`
        ]
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

    // Update the Classroom Observation Criteria Table
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
        0: { cellWidth: 6 },
        1: { cellWidth: 1.5, halign: 'center' }
      },
      body: [
        [{content: "Classroom Observation Criteria", styles: {fontStyle: "bold"}}, {content: "Rating", styles: {fontStyle: "bold"}}],
        ['1. Instruction and discussion facilitation refer to sharing control and direction with students.', scoreMap[1] || ''],
        ['2. Commitment refers to the course specialist act or quality of fulfilling responsibility giving the dedication, discipline, maturity for the learners development and advancement', scoreMap[2] || ''],
        ['3. Teaching for independent learning pertains to the course specialist\'s ability to organize teaching-learning process to enable learners to maximize their potentials', scoreMap[3] || ''],
        ['4. Use of instructional materials and other educational resources to help maximize learning', scoreMap[4] || ''],
        ['5. Classroom climate and virtual community referring to facilitating collaborative and effective interaction.', scoreMap[5] || ''],
        ['6. Course organization referring to objectives, concepts, examples, and program fragments discussed in class.', scoreMap[6] || ''],
        ['7. Assessments referring to the activities required in the course to assess the competence of the students.', scoreMap[7] || ''],
        [{ content: 'Average', styles: { halign: 'right' } }, evaluation.TotalScore || ''],
        [{ content: 'Qualitative Description', styles: { halign: 'right' } }, getQualitativeDescription(evaluation.TotalScore)]
      ],
      theme: 'plain'
    });

    // Add this helper function to get qualitative description
    function getQualitativeDescription(score) {
      if (!score) return '';
      if (score >= 91) return 'Outstanding (O)';
      if (score >= 71) return 'Very Satisfactory (VS)';
      if (score >= 51) return 'Satisfactory (S)';
      if (score >= 31) return 'Fair (F)';
      return 'Poor (P)';
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Source: PUP Evaluation Matrix', 0.5, doc.lastAutoTable.finalY + 0.20);

    doc.text('Comments:', 0.5, doc.lastAutoTable.finalY + 0.80);

    // Add comments section
    const commentY = doc.lastAutoTable.finalY + 1;
    
    // Add the comment text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const comment = evaluation.Comments || 'No comments provided.';
    const splitComment = doc.splitTextToSize(comment, 7.3);
    
    // Draw text and underline for each line
    splitComment.forEach((line, index) => {
        const yPosition = commentY + 0.2 + (index * 0.2);
        doc.text(line, 0.6, yPosition);
        
        // Draw underline for the text
        const textWidth = doc.getTextWidth(line);
        doc.line(0.6, yPosition + 0.02, 0.6 + textWidth, yPosition + 0.02);
    });

    // Signature lines at the bottom of comments section
    const signatureY = commentY + 2;
    
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

    // Add evaluator information before the stamp, positioned on the right
    const evaluatorY = footerY - 1.5; // Position above the stamp
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Evaluated by:', 5, evaluatorY);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Rhyan V. Molinar, Ph.D', 5, evaluatorY + 0.5);
    doc.text('Head of Academic Programs', 5, evaluatorY + 0.7);

    // Then add the stamp image (existing code)
    doc.addImage(
        `data:image/jpg;base64,${logoBase643}`,
        'JPEG',
        5,  // x position (keep same as evaluator text)
        footerY - 0.4,  // y position
        2.8,    // width
        1.13    // height
    );

    // Send the PDF as response
    const pdfBuffer = doc.output('arraybuffer');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=classroom_evaluation.pdf');
    res.send(Buffer.from(pdfBuffer));

    console.log('PDF generation completed successfully');

  } catch (error) {
    console.error('Error in generateEvaluationPdf:', error);
    res.status(500).json({ 
      error: 'Error generating PDF',
      details: error.message,
      stack: error.stack 
    });
  }
};
