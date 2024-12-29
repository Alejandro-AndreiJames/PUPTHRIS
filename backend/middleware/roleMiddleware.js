const Role = require('../models/roleModel');
const UserRole = require('../models/userRoleModel');

const roleMiddleware = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            // Get user roles from UserRole table
            const userRoles = await UserRole.findAll({
                where: { UserID: req.user.userId },
                include: [{
                    model: Role,
                    as: 'Role',
                    attributes: ['RoleName']
                }]
            });

            // Extract role names
            const roles = userRoles.map(userRole => 
                userRole.Role?.RoleName?.toLowerCase() || ''
            );

            // Check if user has any of the allowed roles
            const hasAllowedRole = roles.some(role => 
                allowedRoles.includes(role.toLowerCase())
            );

            if (!hasAllowedRole) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient permissions.'
                });
            }

            next();
        } catch (error) {
            console.error('Role middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error checking permissions'
            });
        }
    };
};

module.exports = roleMiddleware;
