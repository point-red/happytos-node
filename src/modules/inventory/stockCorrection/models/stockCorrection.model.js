const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class StockCorrection extends Model {
    static associate({ [projectCode]: models }) {
      this.hasMany(models.StockCorrectionItem, { as: 'items' });

      this.belongsTo(models.Warehouse, { as: 'warehouse', onUpdate: 'RESTRICT', onDelete: 'RESTRICT' });

      this.hasOne(models.Form, {
        as: 'form',
        foreignKey: 'formableId',
        constraints: false,
        scope: { formable_type: 'StockCorrection' },
      });
    }
  }
  StockCorrection.init(
    {
      warehouseId: {
        type: DataTypes.INTEGER.UNSIGNED,
      },
      typeCorrection: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      qcPassed: {
        type: DataTypes.BOOLEAN,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'StockCorrection',
      tableName: 'stock_corrections',
      underscored: true,
      timestamps: false,
    }
  );
  return StockCorrection;
};
