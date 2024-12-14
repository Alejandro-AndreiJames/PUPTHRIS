const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/userModel');
const { Department } = require('../models/associations');
require('dotenv').config();

exports.forgotPassword = async (req, res) => {
  console.log('Forgot password request received:', req.body);
  
  try {
    const { email } = req.body;
    console.log('Searching for user with email:', email);

    const user = await User.findOne({ where: { Email: email } });
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('No user found with email:', email);
      return res.status(404).json({ message: 'No user found with that email address.' });
    }

    console.log('Generating reset token for user:', user.UserID);
    const token = crypto.randomBytes(20).toString('hex');
    console.log('Generated token:', token);

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiry

    console.log('Saving user with reset token...');
    await user.save();
    console.log('User saved successfully with reset token');

    const resetLink = `${process.env.SITE_LINK}/reset-password?token=${token}`;
    console.log('Reset link generated:', resetLink);
    console.log('Environment variables:', {
      EMAIL_SERVICE: process.env.EMAIL_SERVICE,
      EMAIL_USERNAME: process.env.EMAIL_USERNAME,
      SITE_LINK: process.env.SITE_LINK,
      // Don't log EMAIL_PASSWORD for security
    });

    console.log('Setting up email transporter...');
    let transporter;
    if (['gmail', 'outlook', 'yahoo', 'iskolarngbayan.pup.edu.ph'].includes(process.env.EMAIL_SERVICE)) {
      console.log('Using service-based transport');
      transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    } else {
      console.log('Using SMTP transport');
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }

    console.log('Preparing to send email...');
    try {
      console.log('Verifying transporter...');
      await transporter.verify();
      console.log('Transporter verified successfully');
    } catch (verifyError) {
      console.error('Transporter verification failed:', verifyError);
      throw new Error('Email service configuration error');
    }

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: user.Email,
      subject: 'Password Reset Request',
      text: `Hello ${user.FirstName},\n\nYou requested a password reset. Please use the following link to reset your password:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nPUP Taguig Human Resources System`,
    };
    console.log('Mail options prepared:', { ...mailOptions, text: 'Content hidden for privacy' });

    console.log('Attempting to send email...');
    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully to:', user.Email);

    res.status(200).json({ message: 'Password reset link sent successfully.' });
  } catch (error) {
    console.error('Error during forgot password process:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Failed to process password reset request',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const sendResetEmail = async (toEmail, resetLink, firstName) => {
  try {
    let transporter;

    if (['gmail', 'outlook', 'yahoo', 'iskolarngbayan.pup.edu.ph'].includes(process.env.EMAIL_SERVICE)) {
      transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }

    let mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: toEmail,
      subject: 'Password Reset Request',
      text: `Hello ${firstName},\n\nYou requested a password reset. Please use the following link to reset your password:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nPUP Taguig Human Resources System`,
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully to', toEmail);
  } catch (error) {
    console.error('Error sending password reset email:', error);
  }
};
