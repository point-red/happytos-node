const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const ProcessSendDeleteApproval = require('../../workers/ProcessSendDeleteApproval.worker');
const DeleteFormRequest = require('./DeleteFormRequest');
const { Role, ModelHasRole } = require('@src/models').tenant;

jest.mock('../../workers/ProcessSendDeleteApproval.worker');
beforeEach(() => {
  ProcessSendDeleteApproval.mockClear();
});

describe('Stock Correction - Delete Form Request', () => {
  describe('validations', () => {
    it('throw error when stock correction is not exist', async () => {
      const maker = await factory.user.create();

      await expect(async () => {
        await new DeleteFormRequest(tenantDatabase, {
          maker,
          stockCorrectionId: 'invalid-id',
          deleteFormRequestDto: {
            reason: 'example reason',
          },
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Stock correction is not exist'));
    });

    it('throw error when approved by unwanted user', async () => {
      const hacker = await factory.user.create();
      const { stockCorrection } = await generateRecordFactories();

      await expect(async () => {
        await new DeleteFormRequest(tenantDatabase, {
          maker: hacker,
          stockCorrectionId: stockCorrection.id,
          deleteFormRequestDto: {
            reason: 'example reason',
          },
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not the maker of the stock correction'));
    });

    it('throw error when stock correction is already done', async () => {
      const recordFactories = await generateRecordFactories();
      const { approver, stockCorrectionForm, maker } = recordFactories;
      let { stockCorrection } = recordFactories;
      await stockCorrectionForm.update({
        cancellationStatus: 0,
        requestCancellationTo: approver.id,
        done: true,
      });

      await expect(async () => {
        ({ stockCorrection } = await new DeleteFormRequest(tenantDatabase, {
          maker,
          stockCorrectionId: stockCorrection.id,
          deleteFormRequestDto: {
            reason: 'example reason',
          },
        }).call());
      }).rejects.toThrow(
        new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Can not delete already referenced stock correction')
      );
    });

    it('throw error if user dont have default branch', async () => {
      const branchUser = { isDefault: false };
      const recordFactories = await generateRecordFactories({ branchUser });
      let { stockCorrection, maker } = recordFactories;

      await expect(async () => {
        ({ stockCorrection } = await new DeleteFormRequest(tenantDatabase, {
          maker,
          stockCorrectionId: stockCorrection.id,
          deleteFormRequestDto: {
            reason: 'example reason',
          },
        }).call());
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    });

    it('throw error if user dont have default warehouse', async () => {
      const recordFactories = await generateRecordFactories();
      let { stockCorrection, maker, userWarehouse } = recordFactories;
      await userWarehouse.destroy();

      await expect(async () => {
        ({ stockCorrection } = await new DeleteFormRequest(tenantDatabase, {
          maker,
          stockCorrectionId: stockCorrection.id,
          deleteFormRequestDto: {
            reason: 'example reason',
          },
        }).call());
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    });

    it('throws error if approver doesnt have permission to approve', async () => {
      const invalidUser = await factory.user.create();
      const role = await Role.create({ name: 'user', guardName: 'api' });
      await ModelHasRole.create({
        roleId: role.id,
        modelId: invalidUser.id,
        modelType: 'App\\Model\\Master\\User',
      });
      const recordFactories = await generateRecordFactories();
      const { stockCorrectionForm, maker } = recordFactories;
      let { stockCorrection } = recordFactories;
      await stockCorrectionForm.update({
        cancellationStatus: 0,
        requestApprovalTo: invalidUser.id,
      });
      
      await expect(async () => {
        ({ stockCorrection } = await new DeleteFormRequest(tenantDatabase, {
          maker,
          stockCorrectionId: stockCorrection.id,
          deleteFormRequestDto: {
            reason: 'example reason',
          },
        }).call());
      }).rejects.toThrow('Forbidden');
    });

    it('throws error if user doesnt have permission to delete', async () => {
      const recordFactories = await generateRecordFactories();
      const { maker } = recordFactories;
      let { stockCorrection } = recordFactories;
      const role = await Role.create({ name: 'user', guardName: 'api' });
      await ModelHasRole.create({
        roleId: role.id,
        modelId: maker.id,
        modelType: 'App\\Model\\Master\\User',
      });
      
      await expect(async () => {
        ({ stockCorrection } = await new DeleteFormRequest(tenantDatabase, {
          maker,
          stockCorrectionId: stockCorrection.id,
          deleteFormRequestDto: {
            reason: 'example reason',
          },
        }).call());
      }).rejects.toThrow('Forbidden');
    });

    it('throw error if reason empty', async () => {
      const recordFactories = await generateRecordFactories();
      let { stockCorrection, maker } = recordFactories;

      await expect(async () => {
        ({ stockCorrection } = await new DeleteFormRequest(tenantDatabase, {
          maker,
          stockCorrectionId: stockCorrection.id,
          deleteFormRequestDto: {
            reason: '',
          },
        }).call());
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'reason cannot empty'));
    });

    it('throw error if stock became minus if form deleted', async () => {
      const recordFactories = await generateRecordFactories();
      let { stockCorrection, item, maker, warehouse, branch } = recordFactories;

      const inventoryForm = await factory.form.create({
        date: new Date(),
        branch,
        number: 'SI2101001',
        formable: { id: 1 },
        formableType: 'SalesInvoice',
        createdBy: maker.id,
        updatedBy: maker.id,
      });
      await factory.inventory.createMinus({
        form: inventoryForm,
        warehouse,
        item,
      });

      await expect(async () => {
        ({ stockCorrection } = await new DeleteFormRequest(tenantDatabase, {
          maker,
          stockCorrectionId: stockCorrection.id,
          deleteFormRequestDto: {
            reason: 'delete',
          },
        }).call());
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Stock will minus if you delete this form'));
    });
  });
});

const generateRecordFactories = async ({
  maker,
  approver,
  branch,
  branchUser,
  warehouse,
  userWarehouse,
  item,
  stockCorrection,
  stockCorrectionItem,
  stockCorrectionForm,
} = {}) => {
  await factory.permission.create('stock correction');
  maker = await factory.user.create(maker);
  approver = await factory.user.create(approver);
  branch = await factory.branch.create(branch);
  branchUser = await factory.branchUser.create({ user: maker, branch, isDefault: true, ...branchUser });
  warehouse = await factory.warehouse.create({ branch, ...warehouse });
  userWarehouse = await factory.userWarehouse.create({ user: maker, warehouse, isDefault: true });
  item = await factory.item.create(item);
  stockCorrection = await factory.stockCorrection.create({ warehouse, ...stockCorrection });
  stockCorrectionItem = await factory.stockCorrectionItem.create({
    stockCorrection,
    quantity: 10,
    item,
  });
  stockCorrectionForm = await factory.form.create({
    date: new Date('2022-01-02'),
    branch,
    createdBy: maker.id,
    updatedBy: maker.id,
    requestApprovalTo: approver.id,
    formable: stockCorrection,
    formableType: 'StockCorrection',
    number: 'SC2101001',
  });
  const inventoryForm = await factory.form.create({
    date: new Date('2022-01-01'),
    branch,
    number: 'PI2101001',
    formable: { id: 1 },
    formableType: 'PurchaseInvoice',
    createdBy: maker.id,
    updatedBy: maker.id,
  });
  await factory.inventory.create({
    form: inventoryForm,
    warehouse,
    item,
  });

  return {
    maker,
    approver,
    branch,
    branchUser,
    userWarehouse,
    warehouse,
    item,
    stockCorrection,
    stockCorrectionItem,
    stockCorrectionForm,
  };
};
