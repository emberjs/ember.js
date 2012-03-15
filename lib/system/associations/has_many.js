var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

require("ember-data/system/model/model");

var embeddedFindRecord = function(store, type, data, key) {
  var association = get(data, key);
  return association ? store.loadMany(type, association).ids : [];
};

var referencedFindRecord = function(store, type, data, key, one) {
  return get(data, key);
};

var hasAssociation = function(type, options) {
  options = options || {};

  var embedded = options.embedded,
      findRecord = embedded ? embeddedFindRecord : referencedFindRecord;

  var meta = { type: type, isAssociation: true, options: options, kind: 'hasMany' };

  return Ember.computed(function(key, value) {
    var data = get(this, 'data'),
        store = get(this, 'store'),
        ids, id, association;

    if (typeof type === 'string') {
      type = getPath(this, type, false) || getPath(window, type);
    }

    key = options.key || key;
    ids = findRecord(store, type, data, key);
    association = store.findMany(type, ids);
    set(association, 'parentRecord', this);

    return association;
  }).property().cacheable().meta(meta);
};

DS.hasMany = function(type, options) {
  ember_assert("The type passed to DS.hasMany must be defined", !!type);
  return hasAssociation(type, options);
};
