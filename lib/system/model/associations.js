var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

require("ember-data/system/model/model");

DS.Model.reopenClass({
  typeForAssociation: function(name) {
    var association = get(this, 'associationsByName').get(name);
    return association && association.type;
  },

  associations: Ember.computed(function() {
    var map = Ember.Map.create();

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAssociation) {
        var type = meta.type,
            typeList = map.get(type);

        if (typeof type === 'string') {
          type = getPath(this, type, false) || getPath(window, type);
          meta.type = type;
        }

        if (!typeList) {
          typeList = [];
          map.set(type, typeList);
        }

        typeList.push({ name: name, kind: meta.kind });
      }
    });

    return map;
  }).cacheable(),

  associationsByName: Ember.computed(function() {
    var map = Ember.Map.create(), type;

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAssociation) {
        meta.key = name;
        type = meta.type;

        if (typeof type === 'string') {
          type = getPath(this, type, false) || getPath(window, type);
          meta.type = type;
        }

        map.set(name, meta);
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
  options = options || {};

  var embedded = options.embedded,
      findRecord = embedded ? embeddedFindRecord : referencedFindRecord;

  var meta = { type: type, isAssociation: true, options: options };
  if (one) {
    meta.kind = 'belongsTo';
  } else {
    meta.kind = 'hasMany';
  }

  return Ember.computed(function(key, value) {
    var data = get(this, 'data'), ids, id, association,
        store = get(this, 'store');

    if (typeof type === 'string') {
      type = getPath(this, type, false) || getPath(window, type);
    }

    if (one) {
      if (arguments.length === 2) {
        key = options.key || get(this, 'namingConvention').foreignKey(key);
        data.setAssociation(key, get(value, 'clientId'));
        // put the client id in `key` in the data hash
        return value;
      } else {
        // Embedded belongsTo associations should not look for
        // a foreign key.
        if (embedded) {
          key = options.key || key;

        // Non-embedded associations should look for a foreign key.
        // For example, instead of person, we might look for person_id
        } else {
          key = options.key || get(this, 'namingConvention').foreignKey(key);
        }
        id = findRecord(store, type, data, key, true);
        association = id ? store.find(type, id) : null;
      }
    } else {
      key = options.key || key;
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
