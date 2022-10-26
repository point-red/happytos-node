const httpStatus = require('http-status');
const catchAsync = require('@src/utils/catchAsync');
const apiServices = require('./services/apis');

const findAll = catchAsync(async (req, res) => {
  const { currentTenantDatabase, query: queries } = req;
  const { total, stockCorrections, maxItem, currentPage, totalPage } = await new apiServices.FindAll(
    currentTenantDatabase,
    queries
  ).call();
  res.status(httpStatus.OK).send({
    data: stockCorrections,
    meta: {
      current_page: currentPage,
      last_page: totalPage,
      per_page: maxItem,
      total,
    },
  });
});

const findOne = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    params: { stockCorrectionId },
  } = req;
  const { stockCorrection } = await new apiServices.FindOne(currentTenantDatabase, stockCorrectionId).call();
  res.status(httpStatus.OK).send({ data: stockCorrection });
});

const createFormRequest = catchAsync(async (req, res) => {
  const { currentTenantDatabase, user: maker, body: createFormRequestDto } = req;
  const stockCorrection = await new apiServices.CreateFormRequest(currentTenantDatabase, {
    maker,
    createFormRequestDto,
  }).call();

  res.status(httpStatus.CREATED).send({ data: stockCorrection });
});

const createFormApprove = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: approver,
    params: { stockCorrectionId },
  } = req;
  const { stockCorrection } = await new apiServices.CreateFormApprove(currentTenantDatabase, {
    approver,
    stockCorrectionId,
  }).call();
  res.status(httpStatus.OK).send({ data: stockCorrection });
});

const createFormApproveByToken = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    body: { token },
  } = req;

  const { stockCorrection, project } = await new apiServices.CreateFormApproveByToken(currentTenantDatabase, token).call();
  res.status(httpStatus.OK).send({ data: stockCorrection, meta: { projectName: project.name } });
});

const createFormReject = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: approver,
    params: { stockCorrectionId },
    body: createFormRejectDto,
  } = req;
  const stockCorrection = await new apiServices.CreateFormReject(currentTenantDatabase, {
    approver,
    stockCorrectionId,
    createFormRejectDto,
  }).call();
  res.status(httpStatus.OK).send({ data: stockCorrection });
});

const createFormRejectByToken = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    body: { token },
  } = req;

  const { stockCorrection, project } = await new apiServices.CreateFormRejectByToken(currentTenantDatabase, token).call();
  res.status(httpStatus.OK).send({ data: stockCorrection, meta: { projectName: project.name } });
});

const updateForm = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: maker,
    params: { stockCorrectionId },
    body: updateFormDto,
  } = req;
  const { stockCorrection } = await new apiServices.UpdateForm(currentTenantDatabase, {
    maker,
    stockCorrectionId,
    updateFormDto,
  }).call();
  res.status(httpStatus.OK).send({ data: stockCorrection });
});

const deleteFormRequest = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: maker,
    params: { stockCorrectionId },
    body: deleteFormRequestDto,
  } = req;
  const { stockCorrection } = await new apiServices.DeleteFormRequest(currentTenantDatabase, {
    maker,
    stockCorrectionId,
    deleteFormRequestDto,
  }).call();
  res.status(httpStatus.OK).send({ data: stockCorrection });
});

const deleteFormApprove = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: approver,
    params: { stockCorrectionId },
  } = req;
  const { stockCorrection } = await new apiServices.DeleteFormApprove(currentTenantDatabase, {
    approver,
    stockCorrectionId,
  }).call();
  res.status(httpStatus.OK).send({ data: stockCorrection });
});

const deleteFormApproveByToken = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    body: { token },
  } = req;

  const { stockCorrection, project } = await new apiServices.DeleteFormApproveByToken(currentTenantDatabase, token).call();
  res.status(httpStatus.OK).send({ data: stockCorrection, meta: { projectName: project.name } });
});

const deleteFormReject = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: approver,
    params: { stockCorrectionId },
    body: deleteFormRejectDto,
  } = req;
  const { stockCorrection } = await new apiServices.DeleteFormReject(currentTenantDatabase, {
    approver,
    stockCorrectionId,
    deleteFormRejectDto,
  }).call();
  res.status(httpStatus.OK).send({ data: stockCorrection });
});

const deleteFormRejectByToken = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    body: { token },
  } = req;

  const { stockCorrection, project } = await new apiServices.DeleteFormRejectByToken(currentTenantDatabase, token).call();
  res.status(httpStatus.OK).send({ data: stockCorrection, meta: { projectName: project.name } });
});

module.exports = {
  findAll,
  findOne,
  createFormRequest,
  createFormApprove,
  createFormApproveByToken,
  createFormReject,
  createFormRejectByToken,
  updateForm,
  deleteFormRequest,
  deleteFormApprove,
  deleteFormApproveByToken,
  deleteFormReject,
  deleteFormRejectByToken,
};
