const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Item extends Model {
    static associate({ tenant: models }) {
      this.belongsTo(models.User, { as: 'createdByUser', foreignKey: 'createdBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'updatedByUser', foreignKey: 'updatedBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'archivedByUser', foreignKey: 'archivedBy', onDelete: 'RESTRICT' });

      // TODO: Add ChartOfAccount model
      // this.belongsTo(models.ChartOfAccount, { onDelete: 'RESTRICT' });
    }
  }
  Item.init(
    {
      chartOfAccountId: {
        type: DataTypes.INTEGER,
      },
      code: {
        type: DataTypes.STRING,
      },
      barcode: {
        type: DataTypes.STRING,
      },
      name: {
        type: DataTypes.STRING,
      },
      size: {
        type: DataTypes.STRING,
      },
      color: {
        type: DataTypes.STRING,
      },
      weight: {
        type: DataTypes.STRING,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      taxable: {
        type: DataTypes.BOOLEAN,
      },
      requireProductionNumber: {
        type: DataTypes.BOOLEAN,
      },
      requireExpiryDate: {
        type: DataTypes.BOOLEAN,
      },
      stock: {
        type: DataTypes.DECIMAL,
      },
      stockReminder: {
        type: DataTypes.DECIMAL,
      },
      unitDefault: {
        type: DataTypes.INTEGER,
      },
      unitDefaultPurchase: {
        type: DataTypes.INTEGER,
      },
      unitDefaultSales: {
        type: DataTypes.INTEGER,
      },
      createdBy: {
        type: DataTypes.INTEGER,
      },
      updatedBy: {
        type: DataTypes.INTEGER,
      },
      archivedBy: {
        type: DataTypes.INTEGER,
      },
      archivedAt: {
        type: DataTypes.DATE,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'Item',
      tableName: 'items',
      underscored: true,
    }
  );
  return Item;
};