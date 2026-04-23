module.exports = (sequelize, DataTypes) => {
  const PackingSettings = sequelize.define('PackingSettings', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    boxPrefix: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'BOX',
    },
    boxSeparator: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: '-',
    },
    serialPadding: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
    },
    nextSerial: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    defaultCapacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 65,
    },
    autoCreateNextBox: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    labelPrefix: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'PKG',
    },
  }, {
    tableName: 'PackingSettings',
    timestamps: false,
  });

  return PackingSettings;
};
