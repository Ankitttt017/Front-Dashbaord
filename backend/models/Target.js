module.exports = (sequelize, DataTypes) => {
  const Target = sequelize.define('Target', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    targetDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    shift: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'ALL',
    },
    stationNo: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'Overall',
    },
    targetQty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  }, {
    tableName: 'Targets',
    timestamps: false,
  });

  return Target;
};
