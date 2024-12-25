const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Create a new ticket (all authenticated users)
router.post(
  '/create',
  authMiddleware,
  ticketController.createTicket
);

// Get all tickets (superadmin only)
router.get(
  '/all',
  authMiddleware,
  roleMiddleware(['superadmin']),
  ticketController.getAllTickets
);

// Get user's tickets
router.get(
  '/user',
  authMiddleware,
  ticketController.getUserTickets
);

// Update ticket (superadmin only)
router.patch(
  '/:ticketId',
  authMiddleware,
  roleMiddleware(['superadmin']),
  ticketController.updateTicket
);

// Delete ticket (superadmin only)
router.delete(
  '/:ticketId',
  authMiddleware,
  roleMiddleware(['superadmin']),
  ticketController.deleteTicket
);

// Get ticket by ID
router.get(
  '/:ticketId',
  authMiddleware,
  ticketController.getTicketById
);

module.exports = router;
