const database = require('@src/models');
const tenantModels = require('@src/models/tenantModels');

const { Project } = database.main;

module.exports = async function getCurrentTenantDatabase(tenantName) {
  if (!tenantName) {
    throw new Error('Tenant name is required');
  }

  const project = await Project.findOne({ where: { code: tenantName } });
  // if (!project) {
  //   throw new Error('Tenant project is not exist');
  // }

  const currentTenantDatabase = tenantModels.addOrFindNewProjectDatabase(database, 'happytos');

  return currentTenantDatabase;
};
