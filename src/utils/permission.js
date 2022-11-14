const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

module.exports = async function validatePermission(tenantDatabase, { userId, permissionName }) {
  const userRole = await tenantDatabase.ModelHasRole.findOne({
    where: {
      modelType: 'App\\Model\\Master\\User',
      modelId: userId,
    }
  });

  if (userRole) {
    const role = await tenantDatabase.Role.findOne({
      where: {
        id: userRole.roleId,
      }
    });
    if (role.name != 'super admin') {
      const permission = await tenantDatabase.Permission.findOne({
        where: {
          name: permissionName
        }
      });
      const roleHasPermission = await tenantDatabase.RoleHasPermission.findOne({
        where: {
          permissionId: permission.id,
          roleId: role.id
        }        
      });
      if (!roleHasPermission) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
      }
    }
  }
};