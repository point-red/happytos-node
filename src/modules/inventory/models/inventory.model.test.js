const { Inventory } = require('../../../models').tenant;

describe('Inventory Model', () => {
  describe('custom getters', () => {
    it('returns correct quantity value', () => {
      const inventory = Inventory.build({ quantity: 10 });
      expect(inventory.quantity).toEqual(10);
    });

    it('returns correct quantity reference value', () => {
      const inventory = Inventory.build({ quantityReference: 10 });
      expect(inventory.quantityReference).toEqual(10);
    });

    it('returns correct converter reference value', () => {
      const inventory = Inventory.build({ converterReference: 10 });
      expect(inventory.converterReference).toEqual(10);
    });

    it('returns correct expiry date value', () => {
      const inventory = Inventory.build({ expiryDate: null });
      expect(inventory.expiryDate).toEqual(null);

      const expiryDate = new Date('2022-03-03');
      inventory.expiryDate = expiryDate;
      expect(inventory.expiryDate).toContain('2022-03-03');
    });
  });
});
