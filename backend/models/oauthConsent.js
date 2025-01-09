const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db.config");

const OAuthConsent = sequelize.define(
  "OAuthConsent",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    clientId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    scopes: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "profile",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "oauth_consents",
    indexes: [
      {
        unique: true,
        fields: ["userId", "clientId"],
      },
    ],
  }
);

module.exports = OAuthConsent;
