const { InventoryAuditItem } = require('../../../models').tenant;

describe('Inventory Audit Item Model', () => {
  describe('custom getters', () => {
    it('returns correct quantity value', () => {
      const inventoryAuditItem = InventoryAuditItem.build({ quantity: 10 });
      expect(inventoryAuditItem.quantity).toEqual(10);
    });

    it('returns correct expiry date value', () => {
      const inventoryAuditItem = InventoryAuditItem.build({ expiryDate: null });
      expect(inventoryAuditItem.expiryDate).toEqual(null);

      const expiryDate = new Date('2022-03-03');
      inventoryAuditItem.expiryDate = expiryDate;
      expect(inventoryAuditItem.expiryDate).toContain('2022-03-03');
    });

    it('returns correct price value', () => {
      const inventoryAuditItem = InventoryAuditItem.build({ price: 10000 });
      expect(inventoryAuditItem.price).toEqual(10000);
    });

    it('returns correct converter value', () => {
      const inventoryAuditItem = InventoryAuditItem.build({ converter: 10 });
      expect(inventoryAuditItem.converter).toEqual(10);
    });
  });
});
