module.exports = (sequelize, DataTypes) => {
  const PackingBox = sequelize.define('PackingBox', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    serialNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    boxNumber: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 65,
    },
    packedCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'OPEN',
    },
    generationSource: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'AUTO',
    },
    labelCode: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    qrCodeData: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'PackingBox',
    timestamps: false,
  });

  return PackingBox;
};
