module.exports = (sequelize, DataTypes) => {
  const QAScanned = sequelize.define('QAScanned', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    scanned_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    overall_result: {
      type: DataTypes.STRING
    },
    shift: {
      type: DataTypes.STRING
    },
    box_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'PackingBoxes',
        key: 'id'
      }
    },
    packed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'QA_Scanned',
    timestamps: false
  });

  return QAScanned;
};
