const SequelizeLib = require('sequelize');
const { DataTypes } = SequelizeLib;
const sequelize = require('../db/sequelize');

const db = {};

db.sequelize = sequelize;
db.Sequelize = SequelizeLib;

db.PackingBox = require('./PackingBox')(sequelize, DataTypes);
db.PackingItem = require('./PackingItem')(sequelize, DataTypes);
db.PackingSettings = require('./PackingSettings')(sequelize, DataTypes);
db.Target = require('./Target')(sequelize, DataTypes);

db.PackingBox.hasMany(db.PackingItem, {
  foreignKey: 'boxId',
  as: 'items',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

db.PackingItem.belongsTo(db.PackingBox, {
  foreignKey: 'boxId',
  as: 'box',
});

module.exports = db;
