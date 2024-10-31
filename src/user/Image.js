import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./User.js"; // Import the User model

const Image = sequelize.define("Image", {
  file_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  upload_date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,         // Reference the User model
      key: "id",            // Link to the id field in user_info
    },
  },
});

User.hasMany(Image, { foreignKey: "user_id" });
Image.belongsTo(User, { foreignKey: "user_id" });

export default Image;
