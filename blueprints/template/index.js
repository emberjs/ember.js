export default {
  description: 'Generates a template.',
  normalizeEntityName: function (entityName) {
    return entityName.replace(/\.hbs$/, ''); //Prevent generation of ".hbs.hbs" files
  },
};
