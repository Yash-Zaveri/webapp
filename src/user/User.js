import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const User = sequelize.define('user_info', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true,  // This can be null initially, as it's generated when needed
  },
  verificationTokenExpiration: {
    type: DataTypes.DATE,
    allowNull: true,  // This can be null initially, as it's set when the token is generated
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  freezeTableName: true,
  createdAt: 'account_created',
  updatedAt: 'account_updated',
});

export default User;



