const { Joi } = require('celebrate');

const requireAuth = {
  headers: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(true),
};

const requireStockCorrectionId = {
  params: {
    stockCorrectionId: Joi.number().required(),
  },
};

const createFormRequest = {
  body: Joi.object({
    warehouseId: Joi.number().required(),
    dueDate: Joi.date().iso().required(),
    items: Joi.array().items({
      itemId: Joi.number().required(),
      unit: Joi.string().required(),
      converter: Joi.number().required(),
      stockCorrection: Joi.number().required(),
      notes: Joi.string().default('').allow(null).max(255),
      expiryDate: Joi.date().iso().raw().allow(null),
      productionNumber: Joi.string().allow(null),
      allocationId: Joi.number().allow(null),
    }),
    notes: Joi.string().default('').allow(null).max(255),
    requestApprovalTo: Joi.number().required(),
    typeCorrection: Joi.string().required(),
    qcPassed: Joi.number().required()
  }),
};

const createFormReject = {
  body: Joi.object({
    reason: Joi.string().required(),
  }),
};

const deleteFormRequest = {
  body: Joi.object({
    reason: Joi.string().required(),
  }),
};

const deleteFormReject = {
  body: Joi.object({
    reason: Joi.string().required(),
  }),
};

const updateForm = {
  body: Joi.object({
    dueDate: Joi.date().iso().required(),
    items: Joi.array().items({
      itemId: Joi.number().required(),
      unit: Joi.string().required(),
      converter: Joi.number().required(),
      stockCorrection: Joi.number().required(),
      notes: Joi.string().default('').allow(null).max(255),
      expiryDate: Joi.date().iso().allow(null),
      productionNumber: Joi.string().allow(null),
      allocationId: Joi.number().allow(null),
    }),
    notes: Joi.string().default('').allow(null).max(255),
    requestApprovalTo: Joi.number().required(),
  }),
};

const createFormApproveByToken = {
  body: Joi.object({
    token: Joi.string().required(),
  }),
};

const createFormRejectByToken = {
  body: Joi.object({
    token: Joi.string().required(),
  }),
};

const deleteFormApproveByToken = {
  body: Joi.object({
    token: Joi.string().required(),
  }),
};

const deleteFormRejectByToken = {
  body: Joi.object({
    token: Joi.string().required(),
  }),
};

module.exports = {
  requireAuth,
  createFormRequest,
  requireStockCorrectionId,
  createFormReject,
  deleteFormRequest,
  deleteFormReject,
  updateForm,
  createFormApproveByToken,
  createFormRejectByToken,
  deleteFormApproveByToken,
  deleteFormRejectByToken,
};
