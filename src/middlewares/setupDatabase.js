const httpStatus = require('http-status');
const logger = require('@src/config/logger');
const database = require('@src/models');
const ApiError = require('@src/utils/ApiError');
const tenantModels = require('@src/models/tenantModels');

const { Project } = database.main;

module.exports = async function setupDatabase(req, res, next) {
  try {
    const {
      headers: { tenant, timezone },
    } = req;
    if (!tenant) {
      return next(new ApiError(httpStatus.BAD_REQUEST, 'Tenant headers is required'));
    }

    if (timezone) {
      process.env.TZ = timezone
    }

    const project = await Project.findOne({ where: { code: tenant } });
    if (!project) {
      return next(new ApiError(httpStatus.NOT_FOUND, 'Tenant project is not exist'));
    }

    const currentTenantDatabase = await tenantModels.addOrFindNewProjectDatabase(database, project.code);

    req.currentTenantDatabase = currentTenantDatabase;

    next();
  } catch (error) {
    logger.error(error);
    next(new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Service unavailable'));
  }
};
