var get = Ember.get, getPath = Ember.getPath;

require("ember-data/system/model/model");

DS.Model.reopenClass({
  typeForAssociation: function(association) {
    var type = this.metaForProperty(association).type;
    if (typeof type === 'string') {
      type = getPath(this, type, false) || getPath(window, type);
    }
    return type;
  }
});


var embeddedFindRecord = function(store, type, data, key, one) {
  var association = data ? get(data, key) : one ? null : [];
  if (one) {
    return association ? store.load(type, association).id : null;
  } else {
    return association ? store.loadMany(type, association).ids : [];
  }
};

var referencedFindRecord = function(store, type, data, key, one) {
  return data ? get(data, key) : one ? null : [];
};

var hasAssociation = function(type, options, one) {
  var embedded = options && options.embedded,
    findRecord = embedded ? embeddedFindRecord : referencedFindRecord;

  return Ember.computed(function(key) {
    var data = get(this, 'data'), ids, id, association,
      store = get(this, 'store');

    if (typeof type === 'string') {
      type = getPath(this, type, false) || getPath(window, type);
    }

    key = (options && options.key) ? options.key : key;
    if (one) {
      id = findRecord(store, type, data, key, true);
      association = id ? store.find(type, id) : null;
    } else {
      ids = findRecord(store, type, data, key);
      association = store.findMany(type, ids);
    }

    return association;
  }).property('data').cacheable().meta({ type: type });
};

DS.hasMany = function(type, options) {
  ember_assert("The type passed to DS.hasMany must be defined", !!type);
  return hasAssociation(type, options);
};

DS.hasOne = function(type, options) {
  ember_assert("The type passed to DS.hasOne must be defined", !!type);
  return hasAssociation(type, options, true);
};
