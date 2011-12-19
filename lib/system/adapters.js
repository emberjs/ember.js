DS.Adapter = SC.Object.extend({
  commit: function(store, commitDetails) {
    commitDetails.updated.eachType(function(type, array) {
      this.updateMany(store, type, array.slice());
    }, this);

    commitDetails.created.eachType(function(type, array) {
      this.createMany(store, type, array.slice());
    }, this);

    commitDetails.deleted.eachType(function(type, array) {
      this.deleteMany(store, type, array.slice());
    }, this);
  },

  createMany: function(store, type, models) {
    models.forEach(function(model) {
      this.create(store, type, model);
    }, this);
  },

  updateMany: function(store, type, models) {
    models.forEach(function(model) {
      this.update(store, type, model);
    }, this);
  },

  deleteMany: function(store, type, models) {
    models.forEach(function(model) {
      this.delete(store, type, model);
    }, this);
  },

  findMany: function(store, type, ids) {
    ids.forEach(function(id) {
      this.find(store, type, id);
    }, this);
  }
});

require('ember-data/adapters/fixture_adapter');
