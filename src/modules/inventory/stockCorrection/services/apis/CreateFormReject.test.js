const httpStatus = require('http-status');
const { User, Role, ModelHasRole } = require('@src/models').tenant;
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const CreateFormReject = require('./CreateFormReject');

describe('Stock Correction - Create Form Reject', () => {
  describe('validations', () => {
    it('throw error when stock correction is not exist', async () => {
      const approver = await factory.user.create();

      await expect(async () => {
        await new CreateFormReject(tenantDatabase, { approver, stockCorrectionId: 'invalid-id' }).call();
      }).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Stock correction is not exist'));
    });

    it('throw error when rejected by unwanted user', async () => {
      const hacker = await factory.user.create();
      const { stockCorrection } = await generateRecordFactories();
      const createFormRejectDto = {
        reason: 'example reason',
      };

      await expect(async () => {
        await new CreateFormReject(tenantDatabase, {
          approver: hacker,
          stockCorrectionId: stockCorrection.id,
          createFormRejectDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    });

    it('throw error when stock correction is already approved', async () => {
      const { approver, stockCorrection, stockCorrectionForm } = await generateRecordFactories();
      await stockCorrectionForm.update({
        approvalStatus: 1,
      });
      const createFormRejectDto = {
        reason: 'example reason',
      };

      await expect(async () => {
        await new CreateFormReject(tenantDatabase, {
          approver,
          stockCorrectionId: stockCorrection.id,
          createFormRejectDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Stock correction already approved'));
    });

    it('return rejected stock correction when stock correction is already rejected', async () => {
      const { approver, stockCorrection, stockCorrectionForm } = await generateRecordFactories();
      await stockCorrectionForm.update({
        approvalStatus: -1,
      });
      const createFormRejectDto = {
        reason: 'example reason',
      };

      const createFormApprove = await new CreateFormReject(tenantDatabase, {
        approver,
        stockCorrectionId: stockCorrection.id,
        createFormRejectDto,
      }).call();

      expect(createFormApprove.stockCorrection).toBeDefined();
      expect(createFormApprove.stockCorrection.form.approvalStatus).toEqual(-1);
    });
  });

  describe('success', () => {
    let stockCorrection, stockCorrectionForm, approver, createFormRejectDto;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ stockCorrection, stockCorrectionForm, approver } = recordFactories);

      createFormRejectDto = {
        reason: 'example reason',
      };

      done();
    });

    it('update form status to rejected', async () => {
      (await new CreateFormReject(tenantDatabase, {
        approver,
        stockCorrectionId: stockCorrection.id,
        createFormRejectDto,
      }).call());

      await stockCorrectionForm.reload();
      expect(stockCorrectionForm.approvalStatus).toEqual(-1); // rejected
    });
  });
});

const generateRecordFactories = async ({
  maker,
  approver,
  branch,
  warehouse,
  item,
  stockCorrection,
  stockCorrectionItem,
  stockCorrectionForm,
} = {}) => {
  const getChartOfAccountType = await tenantDatabase.ChartOfAccountType.findOne({
    where: {
      name: 'cost of sales',
      alias: 'beban pokok penjualan',
      isDebit: true,
    },
  });
  let chartOfAccountType
  if (!getChartOfAccountType) {
    chartOfAccountType = await tenantDatabase.ChartOfAccountType.create({
      name: 'cost of sales',
      alias: 'beban pokok penjualan',
      isDebit: true,
    });
  }
  let chartOfAccount
  if (chartOfAccountType) {
    chartOfAccount = await tenantDatabase.ChartOfAccount.create({
      typeId: chartOfAccountType.id,
      position: 'DEBIT',
      name: 'beban selisih persediaan',
      alias: 'beban selisih persediaan',
    });
  }  

  maker = await factory.user.create(maker);
  approver = await factory.user.create(approver);
  branch = await factory.branch.create(branch);
  warehouse = await factory.warehouse.create({ branch, ...warehouse });
  item = await factory.item.create({ chartOfAccount, ...item });
  stockCorrection = await factory.stockCorrection.create({ warehouse, ...stockCorrection });
  stockCorrectionItem = await factory.stockCorrectionItem.create({
    stockCorrection,
    quantity: 10,
    item,
  });
  stockCorrectionForm = await factory.form.create({
    branch,
    createdBy: maker.id,
    updatedBy: maker.id,
    requestApprovalTo: approver.id,
    formable: stockCorrection,
    formableType: 'StockCorrection',
    number: 'SC2101001',
  });

  await tenantDatabase.SettingJournal.create({
    feature: 'stock correction',
    name: 'difference stock expenses',
    description: 'difference stock expenses',
    chartOfAccountId: chartOfAccount.id,
  });

  return {
    maker,
    approver,
    branch,
    warehouse,
    item,
    stockCorrection,
    stockCorrectionItem,
    stockCorrectionForm,
  };
};
