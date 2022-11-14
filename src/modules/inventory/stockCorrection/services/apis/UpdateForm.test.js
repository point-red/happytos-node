const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const ProcessSendUpdateApproval = require('../../workers/ProcessSendUpdateApproval.worker');
const UpdateForm = require('./UpdateForm');
const FindOne = require('./FindOne');
const { Role, ModelHasRole } = require('@src/models').tenant;

jest.mock('../../workers/ProcessSendUpdateApproval.worker');
Date.now = jest.fn(() => new Date(Date.UTC(2021, 0, 1)).valueOf());

beforeEach(() => {
  ProcessSendUpdateApproval.mockClear();
});

describe('Stock Correction - Update Form', () => {
    describe('validations', () => {
        it("throw error if user dont have default branch", async () => {
            const branchUser = { isDefault: false };
            const { stockCorrection, maker, approver, branch, warehouse, allocation, item } = await generateRecordFactories({ branchUser });
            const updateFormDto = generateUpdateFormDto({
                maker,
                approver,
                branch,
                warehouse,
                allocation,
                item,
              });

            await expect(async () => {
                await new UpdateForm(tenantDatabase, { maker, stockCorrectionId: stockCorrection.id, updateFormDto }).call();
            }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
        });
    });

    describe('success', () => {
      let maker, stockCorrectionForm, updateFormDto, stockCorrection;
        beforeEach(async (done) => {
            const recordFactories = await generateRecordFactories();
            const { approver, branch, warehouse, allocation, item } = recordFactories;
            ({ maker, stockCorrectionForm, stockCorrection} = recordFactories);
            updateFormDto = generateUpdateFormDto({
                approver,
                branch,
                warehouse,
                allocation,
                item,
            });

            done();
        });

        it('has maksimum 255 length notes', async () => {
          const notes = generateText(300);
          updateFormDto.notes = notes;
          ({ stockCorrection } = await new UpdateForm(tenantDatabase, { maker, stockCorrectionId: stockCorrection.id, updateFormDto }).call());
    
          expect(stockCorrection.form.notes).toHaveLength(255)
        });
    
        it('replace all double space to single space in notes', async () => {
          const notes = 'stock  correction  notes';
          updateFormDto.notes = notes;
          ({ stockCorrection } = await new UpdateForm(tenantDatabase, { maker, stockCorrectionId: stockCorrection.id, updateFormDto }).call());
    
          expect(stockCorrection.form.notes).toEqual('stock correction notes')
        });

        it('update form with same number', async () => {
          const data = await new UpdateForm(tenantDatabase, { maker, stockCorrectionId: stockCorrection.id, updateFormDto }).call();
    
          expect(data.stockCorrection.form.number).toEqual(stockCorrectionForm.number);
        });

        it('has correct stock correction data', async () => {
          ({ stockCorrection } = await new UpdateForm(tenantDatabase, { maker, stockCorrectionId: stockCorrection.id, updateFormDto }).call());

          expect(stockCorrection.items[0].itemId).toEqual(updateFormDto.items[0].itemId);
          expect(stockCorrection.items[0].quantity).toEqual(updateFormDto.items[0].stockCorrection);
          expect(stockCorrection.items[0].allocationId).toEqual(updateFormDto.items[0].allocationId);
        });
    })
    
    describe('failed', () => {
        let maker, userWarehouse, updateFormDto, stockCorrection;
        beforeEach(async (done) => {
            const recordFactories = await generateRecordFactories();
            const { approver, branch, warehouse, allocation, item } = recordFactories;
            ({ maker, userWarehouse, stockCorrection} = recordFactories);
            updateFormDto = generateUpdateFormDto({
                approver,
                branch,
                warehouse,
                allocation,
                item,
            });

            done();
        });

        it('throws error when user warehouse is missing', async () => {
            await userWarehouse.destroy();

            await expect(async () => {
                await new UpdateForm(tenantDatabase, { maker, stockCorrectionId: stockCorrection.id, updateFormDto }).call();
            }).rejects.toThrow('Forbidden');
        });

        it('throws error if approver doesnt have permission to approve', async () => {
            const invalidUser = await factory.user.create();
            const role = await Role.create({ name: 'user', guardName: 'api' });
            await ModelHasRole.create({
              roleId: role.id,
              modelId: invalidUser.id,
              modelType: 'App\\Model\\Master\\User',
            });
            updateFormDto.requestApprovalTo = invalidUser.id;
            
            await expect(async () => {
              await new UpdateForm(tenantDatabase, { maker, stockCorrectionId: stockCorrection.id, updateFormDto }).call();
            }).rejects.toThrow('Forbidden');
        });

        it('throws error when required data is empty', async () => {
            updateFormDto.items = null;
      
            await expect(async () => {
              await new UpdateForm(tenantDatabase, { maker, stockCorrectionId: stockCorrection.id, updateFormDto }).call();
            }).rejects.toThrow('Invalid data');
        });

        it('throws error when amount is text', async () => {
          updateFormDto.items[0].stockCorrection = '200';
    
          await expect(async () => {
            await new UpdateForm(tenantDatabase, { maker, stockCorrectionId: stockCorrection.id, updateFormDto }).call();
          }).rejects.toThrow('Invalid data');
        });
    });
})

const generateUpdateFormDto = ({ warehouse, item, allocation, approver, notes }) => {
    return {
      warehouseId: warehouse.id,
      typeCorrection: 'out',
      qcPassed: 1,
      dueDate: new Date('2021-01-01'),
      items: [
        {
          itemId: item.id,
          unit: 'PCS',
          converter: 1,
          stockCorrection: -10,
          notes: 'example stock correction item note',
          allocationId: allocation.id,
        },
      ],
      notes,
      requestApprovalTo: approver.id,
    };
  };

const generateRecordFactories = async ({
    maker,
    approver,
    branch,
    branchUser,
    warehouse,
    userWarehouse,
    item,
    allocation,
    stockCorrection,
    stockCorrectionItem,
    stockCorrectionForm,
  } = {}) => {
    await factory.permission.create('stock correction');
    const chartOfAccountType = await tenantDatabase.ChartOfAccountType.create({
      name: 'cost of sales',
      alias: 'beban pokok penjualan',
      isDebit: true,
    });
    const chartOfAccount = await tenantDatabase.ChartOfAccount.create({
      typeId: chartOfAccountType.id,
      position: 'DEBIT',
      name: 'beban selisih persediaan',
      alias: 'beban selisih persediaan',
    });
  
    maker = await factory.user.create(maker);
    approver = await factory.user.create(approver);
    branch = await factory.branch.create(branch);
    branchUser = await factory.branchUser.create({ user: maker, branch, isDefault: true, ...branchUser });
    warehouse = await factory.warehouse.create({ branch, ...warehouse });
    userWarehouse = await factory.userWarehouse.create({ user: maker, warehouse, isDefault: true });
    item = await factory.item.create({ chartOfAccount, ...item });
    allocation = await factory.allocation.create({ branch, ...allocation });
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
  
    const settingJournal = await tenantDatabase.SettingJournal.create({
      feature: 'stock correction',
      name: 'difference stock expenses',
      description: 'difference stock expenses',
      chartOfAccountId: chartOfAccount.id,
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
    await tenantDatabase.Journal.create(
      {
        formId: inventoryForm.id,
        journalableType: 'Item',
        journalableId: item.id,
        chartOfAccountId: item.chartOfAccountId,
        debit: 1000000
      },
    );
  
    return {
      maker,
      approver,
      branch,
      branchUser,
      warehouse,
      userWarehouse,
      item,
      allocation,
      stockCorrection,
      stockCorrectionItem,
      stockCorrectionForm,
      settingJournal,
    };
  };

  const generateText = (length) => {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }