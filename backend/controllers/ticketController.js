const { Ticket, User } = require('../models/associations');
const Role = require('../models/roleModel');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
require('dotenv').config();

const ticketController = {
    // Create ticket
    createTicket: async (req, res) => {
        try {
            const { Subject, Description } = req.body;
            const ticket = await Ticket.create({
                UserID: req.user.userId,
                Subject,
                Description,
                Status: 'open',
                Priority: 'medium'
            });
            
            res.status(201).json({
                success: true,
                message: 'Ticket created successfully',
                data: ticket
            });
        } catch (error) {
            console.error('Error creating ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create ticket'
            });
        }
    },

    // Get all tickets (for superadmin)
    getAllTickets: async (req, res) => {
        try {
            const { status, priority } = req.query;
            const whereClause = {};

            if (status) whereClause.Status = status;
            if (priority) whereClause.Priority = priority;

            const tickets = await Ticket.findAll({
                where: whereClause,
                include: [{
                    model: User,
                    as: 'Creator',
                    attributes: ['FirstName', 'Surname', 'Email']
                }],
                order: [['CreatedAt', 'DESC']]
            });

            res.json({
                success: true,
                data: tickets
            });
        } catch (error) {
            console.error('Error fetching tickets:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch tickets'
            });
        }
    },

    // Get user's tickets
    getUserTickets: async (req, res) => {
        try {
            const tickets = await Ticket.findAll({
                where: { UserID: req.user.userId },
                order: [['CreatedAt', 'DESC']]
            });

            res.json({
                success: true,
                data: tickets
            });
        } catch (error) {
            console.error('Error fetching user tickets:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch tickets'
            });
        }
    },

    // Update ticket
    updateTicket: async (req, res) => {
        try {
            const { id } = req.params;
            const { Status, Priority, Response } = req.body;

            const ticket = await Ticket.findByPk(id);
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            await ticket.update({
                Status,
                Priority,
                Response,
                RespondedBy: req.user.userId
            });

            res.json({
                success: true,
                message: 'Ticket updated successfully',
                data: ticket
            });
        } catch (error) {
            console.error('Error updating ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update ticket'
            });
        }
    },

    // Add delete method
    deleteTicket: async (req, res) => {
        try {
            const { id } = req.params;
            const ticket = await Ticket.findByPk(id);
            
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            await ticket.destroy();

            res.json({
                success: true,
                message: 'Ticket deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete ticket'
            });
        }
    }
};

module.exports = ticketController;
