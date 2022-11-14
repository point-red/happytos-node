const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const validatePermission = require('@src/utils/permission');
const GetCurrentStock = require('@src/modules/inventory/services/GetCurrentStock');
const ProcessSendCreateApprovalWorker = require('../../workers/ProcessSendCreateApproval.worker');

class CreateFormRequest {
  constructor(tenantDatabase, { maker, createFormRequestDto }) {
    this.tenantDatabase = tenantDatabase;
    this.maker = maker;
    this.createFormRequestDto = createFormRequestDto;
  }

  async call() {
    const currentDate = new Date(Date.now());
    const { warehouseId, requestApprovalTo } = this.createFormRequestDto;
    const warehouse = await this.tenantDatabase.Warehouse.findOne({
      where: { id: warehouseId },
    });
    await validate(this.tenantDatabase, { warehouse, maker: this.maker, requestApprovalTo });

    let stockCorrection, stockCorrectionForm;
    await this.tenantDatabase.sequelize.transaction(async (transaction) => {
      stockCorrection = await createStockCorrection(this.tenantDatabase, {
        maker: this.maker,
        createFormRequestDto: this.createFormRequestDto,
        transaction,
      });
      stockCorrectionForm = await createStockCorrectionForm(this.tenantDatabase, {
        maker: this.maker,
        warehouse,
        stockCorrection,
        createFormRequestDto: this.createFormRequestDto,
        currentDate,
        transaction,
      });
      await addStockCorrectionItem(this.tenantDatabase, {
        stockCorrection,
        stockCorrectionForm,
        warehouse,
        createFormRequestDto: this.createFormRequestDto,
        transaction,
      });
    });

    await sendEmailToApprover(this.tenantDatabase, stockCorrection);

    return { stockCorrection, stockCorrectionForm };
  }
}

async function validate(tenantDatabase, { warehouse, maker, requestApprovalTo }) {
  await validateBranchDefaultPermission(tenantDatabase, { makerId: maker.id, branchId: warehouse.branchId });
  await validateWarehouseDefaultPermission(tenantDatabase, { makerId: maker.id, warehouseId: warehouse.id });
  await validatePermission(tenantDatabase, { userId: maker.id, permissionName: 'create stock correction' });
  await validatePermission(tenantDatabase, { userId: requestApprovalTo, permissionName: 'approve stock correction' });
}

async function validateBranchDefaultPermission(tenantDatabase, { makerId, branchId }) {
  const branchUser = await tenantDatabase.BranchUser.findOne({
    where: {
      userId: makerId,
      branchId,
      isDefault: true,
    },
  });
  if (!branchUser) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
}

async function validateWarehouseDefaultPermission(tenantDatabase, { makerId, warehouseId }) {
  const userWarehouse = await tenantDatabase.UserWarehouse.findOne({
    where: {
      userId: makerId,
      warehouseId,
      isDefault: true,
    },
  });
  if (!userWarehouse) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
}

async function createStockCorrection(tenantDatabase, { createFormRequestDto, transaction }) {
  if (!createFormRequestDto.typeCorrection) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid data');
  }
  const stockCorrection = await tenantDatabase.StockCorrection.create(
    {
      warehouseId: createFormRequestDto.warehouseId,
      typeCorrection: createFormRequestDto.typeCorrection,
      qcPassed: createFormRequestDto.qcPassed
    },
    { transaction }
  );

  return stockCorrection;
}

async function createStockCorrectionForm(
  tenantDatabase,
  { maker, warehouse, stockCorrection, createFormRequestDto, currentDate, transaction }
) {
  const formData = await buildFormData(tenantDatabase, {
    maker,
    warehouse,
    createFormRequestDto,
    stockCorrection,
    currentDate,
  });
  const form = await tenantDatabase.Form.create(formData, { transaction });

  return form;
}

async function buildFormData(tenantDatabase, { maker, warehouse, createFormRequestDto, stockCorrection, currentDate }) {
  let { notes, requestApprovalTo } = createFormRequestDto;
  const { incrementNumber, incrementGroup } = await getFormIncrement(tenantDatabase, currentDate);
  const formNumber = generateFormNumber(currentDate, incrementNumber);
  const approver = await tenantDatabase.User.findOne({ where: { id: requestApprovalTo } });
  if (!approver) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Approver is not exist');
  }

  if (notes) {
    if (notes.charAt(0) === ' ') {
      notes = notes.substring(1)
    }
  
    if (notes.charAt(notes.length - 1) === ' ') {
      notes = notes.slice(0, -1);
    }
  }  

  return {
    branchId: warehouse.branchId,
    date: new Date(),
    number: formNumber,
    notes: notes ? notes.replace(/  /g, ' ').substring(0, 255) : notes,
    createdBy: maker.id,
    updatedBy: maker.id,
    incrementNumber,
    incrementGroup,
    formableId: stockCorrection.id,
    formableType: 'StockCorrection',
    requestApprovalTo,
  };
}

async function getFormIncrement(tenantDatabase, currentDate) {
  const incrementGroup = `${currentDate.getFullYear()}${getMonthFormattedString(currentDate)}`;
  const lastForm = await tenantDatabase.Form.findOne({
    where: {
      formableType: 'StockCorrection',
      incrementGroup,
    },
    order: [['increment', 'DESC']],
  });

  return {
    incrementGroup,
    incrementNumber: lastForm ? lastForm.incrementNumber + 1 : 1,
  };
}

function generateFormNumber(currentDate, incrementNumber) {
  const monthValue = getMonthFormattedString(currentDate);
  const yearValue = getYearFormattedString(currentDate);
  const orderNumber = `000${incrementNumber}`.slice(-3);
  return `SC${yearValue}${monthValue}${orderNumber}`;
}

function getYearFormattedString(currentDate) {
  const fullYear = currentDate.getFullYear().toString();
  return fullYear.slice(-2);
}

function getMonthFormattedString(currentDate) {
  const month = currentDate.getMonth() + 1;
  return `0${month}`.slice(-2);
}

async function addStockCorrectionItem(
  tenantDatabase,
  { stockCorrection, stockCorrectionForm, warehouse, createFormRequestDto, transaction }
) {
  const { items: itemsRequest } = createFormRequestDto;
  const doAddStockCorrectionItem = itemsRequest.map(async (itemRequest) => {
    if (itemRequest.converter !== 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Only can use smallest item unit');
    }
    if (typeof itemRequest.stockCorrection === 'string') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid data');
    }
    const item = await tenantDatabase.Item.findOne({ where: { id: itemRequest.itemId } });
    const itemStock = await new GetCurrentStock(tenantDatabase, {
      item,
      date: stockCorrectionForm.date,
      warehouseId: warehouse.id,
      options: {
        expiryDate: itemRequest.expiryDate,
        productionNumber: itemRequest.productionNumber,
      },
    }).call();
    if (itemStock + itemRequest.stockCorrection < 0) {
      throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Stock can not be minus');
    }
    return tenantDatabase.StockCorrectionItem.create(
      {
        stockCorrectionId: stockCorrection.id,
        itemId: item.id,
        quantity: itemRequest.stockCorrection,
        unit: itemRequest.unit,
        converter: itemRequest.converter,
        notes: itemRequest.notes,
        allocationId: itemRequest.allocationId,
        ...(itemRequest.expiryDate && { expiryDate: itemRequest.expiryDate }),
        ...(itemRequest.productionNumber && { productionNumber: itemRequest.productionNumber }),
      },
      { transaction }
    );
  });

  await Promise.all(doAddStockCorrectionItem);
}

async function sendEmailToApprover(tenantDatabase, stockCorrection) {
  const tenantName = tenantDatabase.sequelize.config.database.replace('point_', '');
  // first time email
  await new ProcessSendCreateApprovalWorker({
    tenantName,
    stockCorrectionId: stockCorrection.id,
  }).call();
  // repeatable email
  const aDayInMiliseconds = 1000 * 60 * 60 * 24;
  await new ProcessSendCreateApprovalWorker({
    tenantName,
    stockCorrectionId: stockCorrection.id,
    options: {
      repeat: {
        every: aDayInMiliseconds, // 1 day
        limit: 7,
      },
    },
  }).call();
}

module.exports = CreateFormRequest;
