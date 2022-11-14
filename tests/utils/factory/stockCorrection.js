const { StockCorrection } = require('@src/models').tenant;

async function create({ warehouse }) {
  const stockCorrection = await StockCorrection.create({
    warehouseId: warehouse.id,
    typeCorrection: 'in',
    qcPassed: 1,
  });

  return stockCorrection;
}

module.exports = { create };
