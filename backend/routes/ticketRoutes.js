const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Create ticket (all authenticated users)
router.post('/', authMiddleware, ticketController.createTicket);

// Get all tickets (superadmin only)
router.get('/all', 
    authMiddleware, 
    roleMiddleware(['superadmin']), 
    ticketController.getAllTickets
);

// Get user's tickets (for regular users)
router.get('/my-tickets', 
    authMiddleware, 
    ticketController.getUserTickets
);

// Update ticket (superadmin only)
router.put('/:id', 
    authMiddleware, 
    roleMiddleware(['superadmin']), 
    ticketController.updateTicket
);

// Delete ticket (superadmin only)
router.delete('/:id', 
    authMiddleware, 
    roleMiddleware(['superadmin']), 
    ticketController.deleteTicket
);

module.exports = router;
