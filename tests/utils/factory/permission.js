const { Permission } = require('@src/models').tenant;

async function create(module) {
  await Permission.create({
    name: 'create ' + module,
    guardName: 'api',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await Permission.create({
    name: 'read ' + module,
    guardName: 'api',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await Permission.create({
    name: 'update ' + module,
    guardName: 'api',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await Permission.create({
    name: 'delete ' + module,
    guardName: 'api',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await Permission.create({
    name: 'approve ' + module,
    guardName: 'api',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

module.exports = { create };
