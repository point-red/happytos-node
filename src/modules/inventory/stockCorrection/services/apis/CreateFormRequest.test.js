const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const ProcessSendCreateApproval = require('../../workers/ProcessSendCreateApproval.worker');
const CreateFormRequest = require('./CreateFormRequest');
const FindOne = require('./FindOne');
const { Role, ModelHasRole } = require('@src/models').tenant;

jest.mock('../../workers/ProcessSendCreateApproval.worker');
Date.now = jest.fn(() => new Date(Date.UTC(2021, 0, 1)).valueOf());

beforeEach(() => {
  ProcessSendCreateApproval.mockClear();
});

describe('Stock Correction - Create Form Request', () => {
  describe('validations', () => {
    it("can't create when requested by user that does not have branch default", async () => {
      const branchUser = { isDefault: false };
      const recordFactories = await generateRecordFactories({ branchUser });
      const { maker, approver, branch, warehouse, allocation, item } = recordFactories;
      const createFormRequestDto = generateCreateFormRequestDto({
        approver,
        branch,
        warehouse,
        allocation,
        item,
      });

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, { maker, createFormRequestDto }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    });
  });
  describe('success', () => {
    let stockCorrection, stockCorrectionForm, maker, createFormRequestDto, approver;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { branch, warehouse, allocation, item } = recordFactories;
      const notes = 'stock correction notes';
      ({ maker, approver } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        approver,
        branch,
        warehouse,
        allocation,
        item,
        notes,
      });

      done();
    });

    it('create form with correct date', async () => {
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      expect(stockCorrectionForm).toBeDefined();
      expect(stockCorrectionForm.number).toEqual('SC2101001');
      expect(stockCorrectionForm.date.toISOString().slice(0, 10)).toEqual(new Date().toISOString().slice(0, 10));
      expect(stockCorrectionForm.approvalStatus).toEqual(0); // pending
    });

    it('has correct stock correction data', async () => {
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      expect(stockCorrection.warehouseId).toEqual(createFormRequestDto.warehouseId);
      expect(stockCorrection.typeCorrection).toEqual(createFormRequestDto.typeCorrection);
    });

    it('can create with expiry date and production number', async () => {
      createFormRequestDto.items[0].expiryDate = new Date('2022-03-01');
      createFormRequestDto.items[0].productionNumber = '001';
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      expect(stockCorrectionForm).toBeDefined();
      const stockCorrectionItems = await stockCorrection.getItems();
      expect(stockCorrectionItems[0].expiryDate).toContain('2022-03-01');
      expect(stockCorrectionItems[0].productionNumber).toEqual('001');
    });

    it('will increase the stock correction form number', async () => {
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());
      expect(stockCorrectionForm.number).toEqual('SC2101001');
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());
      expect(stockCorrectionForm.number).toEqual('SC2101002');
    });

    it('has maksimum 255 length notes', async () => {
      const notes = generateText(300);
      createFormRequestDto.notes = notes;
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      expect(stockCorrectionForm.notes).toHaveLength(255)
    });

    it('replace all double space to single space in notes', async () => {
      const notes = 'stock  correction  notes';
      createFormRequestDto.notes = notes;
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      expect(stockCorrectionForm.notes).toEqual('stock correction notes')
    });

    it('replace first and last space in notes', async () => {
      const notes = ' stock correction notes ';
      createFormRequestDto.notes = notes;
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      expect(stockCorrectionForm.notes).toEqual('stock correction notes')
    });

    it('return current stock', async () => {
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());
      const data = await new FindOne(tenantDatabase, stockCorrection.id).call();
      expect(data.stockCorrection.items[0].initialStock).toEqual(100);
    })

    it('check final balance', async () => {
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());
      const data = await new FindOne(tenantDatabase, stockCorrection.id).call();
      expect(data.stockCorrection.items[0].finalStock).toEqual(100+createFormRequestDto.items[0].stockCorrection);
    })

    it('return correct approver', async () => {
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());
      const data = await new FindOne(tenantDatabase, stockCorrection.id).call();
      expect(data.stockCorrection.form.requestApprovalToUser.firstName).toEqual(approver.firstName);
      expect(data.stockCorrection.form.requestApprovalToUser.lastName).toEqual(approver.lastName);
    })
  });

  describe('failed', () => {
    let maker, userWarehouse, createFormRequestDto;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { approver, branch, warehouse, allocation, item } = recordFactories;
      ({ maker, userWarehouse } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        approver,
        branch,
        warehouse,
        allocation,
        item,
      });

      done();
    });

    it('throws error if approver doesnt have permission to approve', async () => {
      const invalidUser = await factory.user.create();
      const role = await Role.create({ name: 'user', guardName: 'api' });
      await ModelHasRole.create({
        roleId: role.id,
        modelId: invalidUser.id,
        modelType: 'App\\Model\\Master\\User',
      });
      createFormRequestDto.requestApprovalTo = invalidUser.id;
      
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Forbidden');
    });

    it('throws error if user doesnt have permission to create', async () => {
      const maker = await factory.user.create();
      const role = await Role.create({ name: 'user', guardName: 'api' });
      await ModelHasRole.create({
        roleId: role.id,
        modelId: maker.id,
        modelType: 'App\\Model\\Master\\User',
      });
      
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Forbidden');
    });

    it('throws error when user warehouse is missing', async () => {
      await userWarehouse.destroy();

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Forbidden');
    });

    it('throws error when approver is missing', async () => {
      createFormRequestDto.requestApprovalTo = null;

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Approver is not exist');
    });

    it('throws error when request item without smallest unit', async () => {
      createFormRequestDto.items[0].converter = 2;

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Only can use smallest item unit');
    });

    it('throws error when item stock be minus', async () => {
      createFormRequestDto.items[0].stockCorrection = -200;

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Stock can not be minus');
    });

    it('throws error when required data is empty', async () => {
      createFormRequestDto.typeCorrection = null;

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Invalid data');
    });

    it('throws error when amount is text', async () => {
      createFormRequestDto.items[0].stockCorrection = '200';

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Invalid data');
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
  allocation,
  item,
  inventory,
  inventoryForm,
} = {}) => {
  await factory.permission.create('stock correction');
  maker = await factory.user.create(maker);
  approver = await factory.user.create(approver);
  branch = await factory.branch.create(branch);
  branchUser = await factory.branchUser.create({ user: maker, branch, isDefault: true, ...branchUser });
  warehouse = await factory.warehouse.create({ branch, ...warehouse });
  userWarehouse = await factory.userWarehouse.create({ user: maker, warehouse, isDefault: true });
  allocation = await factory.allocation.create({ branch, ...allocation });
  item = await factory.item.create({ ...item });
  inventoryForm = await factory.form.create({
    branch,
    number: 'PI2101001',
    formable: { id: 1 },
    formableType: 'PurchaseInvoice',
    createdBy: maker.id,
    updatedBy: maker.id,
    ...inventoryForm,
  });
  inventory = await factory.inventory.create({ form: inventoryForm, warehouse, item });

  return {
    maker,
    approver,
    branch,
    branchUser,
    warehouse,
    userWarehouse,
    allocation,
    item,
    inventory,
  };
};

const generateCreateFormRequestDto = ({ warehouse, item, allocation, approver, notes }) => {
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

const generateText = (length) => {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
