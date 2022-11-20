const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const validatePermission = require('@src/utils/permission');
const ProcessSendDeleteApprovalWorker = require('../../workers/ProcessSendDeleteApproval.worker');
const GetCurrentStock = require('../../../services/GetCurrentStock');

class DeleteFormRequest {
  constructor(tenantDatabase, { maker, stockCorrectionId, deleteFormRequestDto }) {
    this.tenantDatabase = tenantDatabase;
    this.maker = maker;
    this.stockCorrectionId = stockCorrectionId;
    this.deleteFormRequestDto = deleteFormRequestDto;
  }

  async call() {
    const stockCorrection = await this.tenantDatabase.StockCorrection.findOne({
      where: { id: this.stockCorrectionId },
      include: [
        {
          model: this.tenantDatabase.StockCorrectionItem,
          as: 'items',
          include: [{ model: this.tenantDatabase.Item, as: 'item' }],
        },
        { model: this.tenantDatabase.Form, as: 'form' },
        { model: this.tenantDatabase.Warehouse, as: 'warehouse' },
      ],
    });

    await validate(this.tenantDatabase, { stockCorrection, maker: this.maker});
    if (!this.deleteFormRequestDto.reason || !this.deleteFormRequestDto.reason?.length === 0) {
      throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'reason cannot empty');
    }
    await checkStockCorretionItems(this.tenantDatabase, { stockCorrection });
    const { form } = stockCorrection;
    await form.update({
      cancellationStatus: 0,
      requestCancellationBy: this.maker.id,
      requestCancellationTo: form.requestApprovalTo,
      requestCancellationReason: this.deleteFormRequestDto.reason,
      requestCancellationAt: new Date(),
    });

    await sendEmailToApprover(this.tenantDatabase, stockCorrection);

    return { stockCorrection };
  }
}

async function checkStockCorretionItems(tenantDatabase, { stockCorrection }) {
  const { items: stockCorrectionItems, form: stockCorrectionForm } = stockCorrection;
  const doCheckStockCorrectionItems = stockCorrectionItems.map(async (stockCorrectionItem) => {
    const currentStock = await new GetCurrentStock(tenantDatabase, {
      item: stockCorrectionItem.item,
      date: new Date(),
      warehouseId: stockCorrection.warehouseId,
      options: {
        expiryDate: stockCorrectionItem.expiryDate,
        productionNumber: stockCorrectionItem.productionNumber,
      },
    }).call();
    if (currentStock - stockCorrectionItem.quantity < 0) {
      throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Stock will minus if you delete this form', {
        formNumber: stockCorrectionForm.number,
        formStatus: stockCorrectionForm.approvalStatus,
        formType: stockCorrectionForm.formableType,
      });
    }
  });

  await Promise.all(doCheckStockCorrectionItems);
}

async function validate(tenantDatabase, { stockCorrection, maker }) {
  if (!stockCorrection) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stock correction is not exist');
  }
  const { form } = stockCorrection;
  if (form.createdBy !== maker.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not the maker of the stock correction');
  }
  if (form.done === true) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Can not delete already referenced stock correction');
  }
  await validateBranchDefaultPermission(tenantDatabase, { makerId: maker.id, branchId: stockCorrection.warehouse.branchId });
  await validateWarehouseDefaultPermission(tenantDatabase, { makerId: maker.id, warehouseId: stockCorrection.warehouse.id });
  await validatePermission(tenantDatabase, { userId: maker.id, permissionName: 'delete stock correction' });
  await validatePermission(tenantDatabase, { userId: stockCorrection.form.requestApprovalTo, permissionName: 'approve stock correction' });
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

async function sendEmailToApprover(tenantDatabase, stockCorrection) {
  const tenantName = tenantDatabase.sequelize.config.database.replace('point_', '');
  // first time email
  await new ProcessSendDeleteApprovalWorker({
    tenantName,
    stockCorrectionId: stockCorrection.id,
  }).call();
  // repeatable email
  const aDayInMiliseconds = 1000 * 60 * 60 * 24;
  await new ProcessSendDeleteApprovalWorker({
    tenantName,
    stockCorrectionId: stockCorrection.id,
    options: {
      repeat: {
        every: aDayInMiliseconds, // 1 day
        limit: 6,
      },
      jobId: `delete-email-approval-${stockCorrection.id}`,
    },
  }).call();
}

module.exports = DeleteFormRequest;
