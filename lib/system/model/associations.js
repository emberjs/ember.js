var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

require("ember-data/system/model/model");

DS.Model.reopenClass({
  typeForAssociation: function(association) {
    var type = this.metaForProperty(association).type;
    if (typeof type === 'string') {
      type = getPath(this, type, false) || getPath(window, type);
    }
    return type;
  },

  associations: Ember.computed(function() {
    var map = Ember.Map.create();

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAssociation) {
        var type = meta.type,
            typeList = map.get(type);

        if (!typeList) {
          typeList = [];
          map.set(type, typeList);
        }

        typeList.push({ name: name, kind: meta.kind });
      }
    });

    return map;
  }).cacheable()
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

  var meta = { type: type, isAssociation: true };
  if (one) {
    meta.kind = 'belongsTo';
  } else {
    meta.kind = 'hasMany';
  }

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
      set(association, 'parentRecord', this);
    }

    return association;
  }).property('data').cacheable().meta(meta);
};

DS.hasMany = function(type, options) {
  ember_assert("The type passed to DS.hasMany must be defined", !!type);
  return hasAssociation(type, options);
};

DS.hasOne = function(type, options) {
  ember_assert("The type passed to DS.belongsTo must be defined", !!type);
  return hasAssociation(type, options, true);
};

DS.belongsTo = DS.hasOne;
