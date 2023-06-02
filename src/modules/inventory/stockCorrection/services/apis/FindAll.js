const { Op } = require('sequelize');

class FindAll {
  constructor(tenantDatabase, queries = {}) {
    this.tenantDatabase = tenantDatabase;
    this.queries = queries;
  }

  async call() {
    const [queryLimit, queryPage] = [parseInt(this.queries.limit, 10) || 10, parseInt(this.queries.page, 10) || 1];
    const { count: total, rows: stockCorrections } = await this.tenantDatabase.StockCorrection.findAndCountAll({
      where: generateFilter(this.queries),
      include: [
        {
          model: this.tenantDatabase.Form,
          as: 'form',
          include: [
            { model: this.tenantDatabase.User, as: 'createdByUser' },
            { model: this.tenantDatabase.User, as: 'approvalByUser' },
          ],
        },
        {
          model: this.tenantDatabase.StockCorrectionItem,
          as: 'items',
          include: [{ model: this.tenantDatabase.Item, as: 'item' }],
        },
        {
          model: this.tenantDatabase.Warehouse,
          as: 'warehouse',
        },
      ],
      order: [['form', 'created_at', 'DESC']],
      limit: queryLimit,
      offset: offsetParams(queryPage, queryLimit),
      subQuery: false,
    });

    const totalPage = Math.ceil(total / parseInt(queryLimit, 10));

    return { total, stockCorrections, maxItem: queryLimit, currentPage: queryPage, totalPage };
  }
}

function generateFilter(queries) {
  const filter = { [Op.and]: [] };

  // form date
  const filterFormDate = generateFilterFormDate(queries);
  filter[Op.and] = [...filter[Op.and], filterFormDate];

  // form status
  const filterFormStatus = generateFilterFormStatus(queries.filter_form);
  filter[Op.and] = [...filter[Op.and], ...filterFormStatus];

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

function generateFilterFormDate(queries) {
  let minDate = new Date();
  minDate.setDate(new Date().getDate() - 30);
  if (queries.filter_date_min) {
    minDate = new Date(queries.filter_date_min);
  }
  minDate.setHours(0, 0, 0, 0);

  let maxDate = new Date();
  if (queries.filter_date_max) {
    maxDate = new Date(queries.filter_date_max);
  }
  maxDate.setHours(24, 0, 0, 0);

  return {
    '$form.date$': {
      [Op.between]: [minDate, maxDate],
    },
  };
}

function generateFilterFormStatus(formQueries) {
  if (!formQueries) {
    return [];
  }

  const result = [];
  const [doneStatus, approvalStatus] = formQueries.split(';');

  const doneStatuses = {
    pending: false,
    done: true,
  };

  const approvalStatusses = {
    approvalPending: 0,
    approvalApproved: 1,
    approvalRejected: -1,
  };
  result.push({ '$form.cancellation_status$': null });
  if (doneStatus !== 'null') {
    if (doneStatus === 'cancellationApproved') {
      result.push({ '$form.cancellation_status$': 1 });
    }

    if (doneStatus !== 'cancellationApproved') {
      result.push({ '$form.cancellation_status$': null });
      result.push({ '$form.done$': doneStatuses[doneStatus] });
    }
  }

  if (approvalStatus !== 'null') {
    result.push({ '$form.approval_status$': approvalStatusses[approvalStatus] });
  }

  return result;
}

function offsetParams(page = 1, maxItem = 10) {
  return page > 1 ? maxItem * (page - 1) : 0;
}

module.exports = FindAll;