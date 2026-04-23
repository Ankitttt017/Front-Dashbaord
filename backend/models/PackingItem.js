module.exports = (sequelize, DataTypes) => {
  const PackingItem = sequelize.define('PackingItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    boxId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'PackingBox',
        key: 'id',
      },
    },
    boxNumber: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    slotNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    partId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    qrCode: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    marking: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'Marking',
    },
    packedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'PackingItem',
    timestamps: false,
  });

  return PackingItem;
};
