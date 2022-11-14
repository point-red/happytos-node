const { StockCorrectionItem } = require('../../../../models').tenant;

describe('Stock Correction Item Model', () => {
  describe('custom getters', () => {
    it('returns correct initial stock value', () => {
      const stockCorrectionItem = StockCorrectionItem.build({ initialStock: 100 });
      expect(stockCorrectionItem.initialStock).toEqual(100);
    });

    it('returns correct quantity value', () => {
      const stockCorrectionItem = StockCorrectionItem.build({ quantity: 100 });
      expect(stockCorrectionItem.quantity).toEqual(100);
    });

    it('returns correct final stock value', () => {
      const stockCorrectionItem = StockCorrectionItem.build({ finalStock: 100 });
      expect(stockCorrectionItem.finalStock).toEqual(100);
    });

    it('returns correct converter value', () => {
      const stockCorrectionItem = StockCorrectionItem.build({ converter: 100 });
      expect(stockCorrectionItem.converter).toEqual(100);
    });

    it('returns correct expiry date value', () => {
      const stockCorrectionItem = StockCorrectionItem.build({ expiryDate: null });
      expect(stockCorrectionItem.expiryDate).toEqual(null);

      const expiryDate = new Date('2022-03-03');
      stockCorrectionItem.expiryDate = expiryDate;
      expect(stockCorrectionItem.expiryDate).toContain('2022-03-03');
    });
  });
});
