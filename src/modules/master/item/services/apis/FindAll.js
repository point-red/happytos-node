const { Op } = require('sequelize');

class FindAll {
  constructor(tenantDatabase, queries = {}) {
    this.tenantDatabase = tenantDatabase;
    this.queries = queries;
  }

  async call() {
    const items = await this.tenantDatabase.Item.findAll({
      where: generateFilter(this.queries),
      include: [
        {
          model: this.tenantDatabase.Inventory,
          as: 'inventories',
          where: { warehouseId: this.queries.warehouse_id },
          required: false,
        },
        {
          model: this.tenantDatabase.ItemUnit,
          as: 'units',
        },
      ],
      order: [['name', 'ASC']],
    });

    return { items };
  }
}

function generateFilter(queries) {
  const filter = { [Op.and]: [] };

  // like
  const filterLike = generateFilterLike(queries.filter_like);
  if (filterLike.length > 0) {
    filter[Op.and] = [...filter[Op.and], { [Op.or]: filterLike }];
  }

  return filter;
}

function generateFilterLike(likeQueries) {
  if (!likeQueries) {
    return [];
  }

  const filtersObject = JSON.parse(likeQueries);
  const filterKeys = Object.keys(filtersObject);

  const result = filterKeys.map((key) => {
    const likeKey = key.split('.').length > 1 ? `$${key}$` : key;

    return {
      [likeKey]: { [Op.substring]: filtersObject[key] || '' },
    };
  });

  return result;
}

module.exports = FindAll;
