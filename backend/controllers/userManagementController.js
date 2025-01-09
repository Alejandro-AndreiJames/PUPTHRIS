const { sequelize } = require("../config/db.config");
const { Op } = require("sequelize");

const User = require("../models/userModel");
const Role = require("../models/roleModel");
const Coordinator = require("../models/coordinatorModel");
const { Department, CollegeCampus } = require("../models/associations");

const webhookController = require("./webhookController");

require("dotenv").config();

exports.updateEmploymentType = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { UserID, EmploymentType } = req.body;

    console.log(
      "Received request to update Employment Type for User:",
      UserID,
      "to",
      EmploymentType
    );

    const user = await User.findByPk(UserID, { transaction });
    if (!user) {
      await transaction.rollback();
      console.log("User not found:", UserID);
      return res.status(404).json({ message: "User not found" });
    }

    user.EmploymentType = EmploymentType;
    await user.save({ transaction });

    await transaction.commit();
    const updatedUser = await User.findByPk(UserID);
    const webhookSuccess = await webhookController.sendFacultyUpdateWebhook(
      UserID
    );
    if (!webhookSuccess) {
      console.warn(
        "Failed to send webhook to FLSS, but employment type was updated"
      );
    }

    console.log(
      "Employment Type updated successfully for User:",
      UserID,
      EmploymentType
    );
    res.status(200).json({
      message: "Employment type updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Error updating employment type:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateUserRoles = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { UserID, Roles } = req.body;

    const user = await User.findByPk(UserID, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    if (Roles && Roles.length > 0) {
      const roles = await Role.findAll({
        where: { RoleID: Roles },
        transaction,
      });
      await user.setRoles(roles, { transaction });
    }

    await transaction.commit();
    res.status(200).json({ message: "User roles updated successfully" });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Error updating user roles:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const { UserID } = req.params;

    const user = await User.findByPk(UserID, {
      include: [
        {
          model: Department,
          as: "Department",
          attributes: ["DepartmentName"],
        },
        {
          model: Role,
          as: "Roles",
          through: { attributes: [] },
          attributes: ["RoleName"],
        },
        {
          model: CollegeCampus,
          as: "CollegeCampus",
          attributes: ["Name"],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { campusId, search, departmentId, employmentType, role } = req.query;

    // Build where clause
    let whereClause = {};

    if (campusId) {
      whereClause.CollegeCampusID = campusId;
    }

    if (departmentId) {
      whereClause.DepartmentID = departmentId;
    }

    if (employmentType) {
      whereClause.EmploymentType = employmentType;
    }

    // Handle search with MySQL LIKE
    if (search) {
      whereClause[Op.or] = [
        { FirstName: { [Op.like]: `%${search}%` } },
        { Surname: { [Op.like]: `%${search}%` } },
        { Fcode: { [Op.like]: `%${search}%` } },
      ];
    }

    const users = await User.findAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: "Department",
          attributes: ["DepartmentName"],
        },
        {
          model: Role,
          as: "Roles",
          through: { attributes: [] },
          attributes: ["RoleID", "RoleName"],
          ...(role && {
            where: {
              RoleName: { [Op.like]: `%${role}%` },
            },
          }),
        },
        {
          model: CollegeCampus,
          as: "CollegeCampus",
          attributes: ["Name"],
        },
      ],
      attributes: { include: ["isActive"] },
      offset: offset,
      limit: limit,
      order: [["UserID", "ASC"]],
      distinct: true,
    });

    // Get total count with filters
    const totalCount = await User.count({
      where: whereClause,
      include: [
        {
          model: Role,
          as: "Roles",
          ...(role && {
            where: {
              RoleName: { [Op.like]: `%${role}%` },
            },
          }),
        },
      ],
      distinct: true,
    });

    console.log(`Found ${users.length} users for campus ID ${campusId}`);

    res.status(200).json({
      data: users,
      metadata: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll();
    res.status(200).json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateUserDepartment = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { userId } = req.params;
    const { departmentId } = req.body;

    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const department = await Department.findByPk(departmentId, { transaction });
    if (!department) {
      await transaction.rollback();
      return res.status(404).json({ message: "Department not found" });
    }

    await user.setDepartment(department, { transaction });
    await transaction.commit();

    res
      .status(200)
      .json({ message: "User department updated successfully", user });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Error updating user department:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleUserActiveStatus = async (req, res) => {
  let transaction;
  try {
    console.log("Toggling user status for userId:", req.params.userId);

    if (!sequelize) {
      throw new Error("Database connection not established");
    }
    transaction = await sequelize.transaction();

    const { userId } = req.params;
    const user = await User.findByPk(userId, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Current user status:", user.isActive);
    user.isActive = !user.isActive;
    await user.save({ transaction });
    console.log("Updated user status:", user.isActive);

    // If the user is being deactivated and is a coordinator, remove them from the coordinator position
    if (!user.isActive) {
      const coordinator = await Coordinator.findOne({
        where: { UserID: userId },
        transaction,
      });
      if (coordinator) {
        console.log("User is a coordinator, removing from position");
        await coordinator.destroy({ transaction });
      }
    }

    await transaction.commit();
    const updatedUser = await User.findByPk(userId);
    const webhookSuccess = await webhookController.sendFacultyUpdateWebhook(
      userId
    );
    if (!webhookSuccess) {
      console.warn("Failed to send webhook to FLSS, but status was updated");
    }

    res.status(200).json({
      message: "User status updated successfully",
      isActive: updatedUser.isActive,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Error toggling user status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateUserCampus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { campusId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const campus = await CollegeCampus.findByPk(campusId);
    if (!campus) {
      return res.status(404).json({ message: "College Campus not found" });
    }

    user.CollegeCampusID = campusId;
    await user.save();

    res.status(200).json({ message: "User campus updated successfully", user });
  } catch (error) {
    console.error("Error updating user campus:", error);
    res.status(500).json({ message: "Server error" });
  }
};
