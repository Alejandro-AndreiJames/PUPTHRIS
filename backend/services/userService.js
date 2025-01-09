const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const UserRole = require("../models/userRoleModel");
const Role = require("../models/roleModel");

class UserService {
  async authenticate(email, password) {
    try {
      console.log("Attempting to authenticate user:", email);

      // Find user by email
      const user = await User.findOne({
        where: { Email: email },
      });

      if (!user) {
        console.log("User not found");
        return null;
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.PasswordHash);
      if (!validPassword) {
        console.log("Invalid password");
        return null;
      }

      // Check if user has faculty role
      const hasFacultyRole = await this.userHasFacultyRole(user.UserID);
      if (!hasFacultyRole) {
        console.log("User does not have faculty role");
        return { error: "UNAUTHORIZED_ROLE" };
      }

      console.log("User authenticated successfully");
      return user;
    } catch (error) {
      console.error("User authentication error:", error);
      return null;
    }
  }

  async userHasFacultyRole(userId) {
    try {
      const userRoles = await UserRole.findAll({
        where: { UserID: userId },
        include: [
          {
            model: Role,
            where: { RoleName: "faculty" },
          },
        ],
      });

      return userRoles.length > 0;
    } catch (error) {
      console.error("Error checking faculty role:", error);
      return false;
    }
  }

  async getUserById(userId) {
    try {
      return await User.findByPk(userId);
    } catch (error) {
      console.error("Get user by ID error:", error);
      return null;
    }
  }
}

module.exports = UserService;
