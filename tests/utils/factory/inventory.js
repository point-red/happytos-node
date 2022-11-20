const { Inventory } = require('@src/models').tenant;

async function create({
  form,
  warehouse,
  item,
  quantity = 100,
  expiryDate,
  productionNumber,
  needRecalculate = false,
  quantityReference = 100,
  unitReference = 'PCS',
  converterReference = 1,
  isPosted = true,
}) {
  const inventory = await Inventory.create({
    formId: form.id,
    warehouseId: warehouse.id,
    itemId: item.id,
    quantity,
    expiryDate,
    productionNumber,
    needRecalculate,
    quantityReference,
    unitReference,
    converterReference,
    isPosted,
  });

  return inventory;
}

async function createMinus({
  form,
  warehouse,
  item,
  quantity = -105,
  expiryDate,
  productionNumber,
  needRecalculate = false,
  quantityReference = 100,
  unitReference = 'PCS',
  converterReference = 1,
  isPosted = true,
}) {
  const inventory = await Inventory.create({
    formId: form.id,
    warehouseId: warehouse.id,
    itemId: item.id,
    quantity,
    expiryDate,
    productionNumber,
    needRecalculate,
    quantityReference,
    unitReference,
    converterReference,
    isPosted,
  });

  return inventory;
}

module.exports = { create, createMinus };
