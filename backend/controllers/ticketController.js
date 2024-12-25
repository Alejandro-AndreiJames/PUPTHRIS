const { Ticket, User } = require('../models/associations');
const Role = require('../models/roleModel');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a new ticket
exports.createTicket = async (req, res) => {
    try {
        const { Subject, Description, Priority } = req.body;
        const UserID = req.user.userId; // From auth middleware

        const ticket = await Ticket.create({
            UserID,
            Subject,
            Description,
            Priority,
            Status: 'open'
        });

        // Fetch the created ticket with user details
        const ticketWithDetails = await Ticket.findByPk(ticket.TicketID, {
            include: [{
                model: User,
                as: 'Creator',
                attributes: ['FirstName', 'Surname', 'Email']
            }]
        });

        // Notify admins about new ticket
        await notifyAdmins(ticketWithDetails);

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            ticket: ticketWithDetails
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating ticket',
            error: error.message
        });
    }
};

// Get all tickets
exports.getAllTickets = async (req, res) => {
    try {
        const tickets = await Ticket.findAll({
            include: [
                {
                    model: User,
                    as: 'Creator',
                    attributes: ['UserID', 'FirstName', 'Surname', 'Email']
                },
                {
                    model: User,
                    as: 'Responder',
                    attributes: ['UserID', 'FirstName', 'Surname']
                }
            ],
            order: [['CreatedAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            tickets
        });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tickets',
            error: error.message
        });
    }
};

// Get user's tickets
exports.getUserTickets = async (req, res) => {
    try {
        const UserID = req.user.userId;
        const tickets = await Ticket.findAll({
            where: { UserID },
            include: [
                {
                    model: User,
                    as: 'Responder',
                    attributes: ['UserID', 'FirstName', 'Surname']
                }
            ],
            order: [['CreatedAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            tickets
        });
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tickets',
            error: error.message
        });
    }
};

// Get ticket by ID
exports.getTicketById = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findByPk(ticketId, {
            include: [
                {
                    model: User,
                    as: 'Creator',
                    attributes: ['UserID', 'FirstName', 'Surname', 'Email']
                },
                {
                    model: User,
                    as: 'Responder',
                    attributes: ['UserID', 'FirstName', 'Surname']
                }
            ]
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.status(200).json({
            success: true,
            ticket
        });
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ticket',
            error: error.message
        });
    }
};

// Update ticket
exports.updateTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { Status, Response } = req.body;
        const RespondedBy = req.user.userId;

        const ticket = await Ticket.findByPk(ticketId, {
            include: [{
                model: User,
                as: 'Creator',
                attributes: ['Email', 'FirstName', 'Surname']
            }]
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        await ticket.update({
            Status,
            Response,
            RespondedBy
        });

        // Notify user about ticket update
        await notifyUser(ticket, Status, Response);

        res.status(200).json({
            success: true,
            message: 'Ticket updated successfully',
            ticket
        });
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating ticket',
            error: error.message
        });
    }
};

// Delete ticket
exports.deleteTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findByPk(ticketId);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        await ticket.destroy();

        res.status(200).json({
            success: true,
            message: 'Ticket deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting ticket',
            error: error.message
        });
    }
};

// Helper function to notify admins about new tickets
const notifyAdmins = async (ticket) => {
    try {
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            }
        });

        // Find admin users
        const adminUsers = await User.findAll({
            include: [{
                model: Role,
                where: {
                    RoleName: {
                        [Op.in]: ['admin', 'superadmin']
                    }
                }
            }]
        });

        const mailPromises = adminUsers.map(admin => {
            const mailOptions = {
                from: process.env.EMAIL_USERNAME,
                to: admin.Email,
                subject: `New Support Ticket: ${ticket.Subject}`,
                text: `
                    A new support ticket has been created:
                    
                    Ticket ID: ${ticket.TicketID}
                    Created By: ${ticket.Creator.FirstName} ${ticket.Creator.Surname}
                    Subject: ${ticket.Subject}
                    Priority: ${ticket.Priority}
                    Description: ${ticket.Description}
                    
                    Please log in to the HRIS system to handle this ticket.
                `
            };
            return transporter.sendMail(mailOptions);
        });

        await Promise.all(mailPromises);
    } catch (error) {
        console.error('Error sending admin notifications:', error);
    }
};

// Helper function to notify users about ticket updates
const notifyUser = async (ticket, status, response) => {
    try {
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: ticket.Creator.Email,
            subject: `Ticket Update: ${ticket.Subject}`,
            text: `
                Dear ${ticket.Creator.FirstName},
                
                Your ticket has been updated:
                
                Ticket ID: ${ticket.TicketID}
                Subject: ${ticket.Subject}
                New Status: ${status}
                Response: ${response}
                
                You can log in to the HRIS system to view the complete details.
            `
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending user notification:', error);
    }
};
