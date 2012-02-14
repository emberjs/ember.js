var get = Ember.get, set = Ember.set, getPath = Ember.getPath, fmt = Ember.String.fmt;

var OrderedSet = Ember.Object.extend({
  init: function() {
    this.clear();
  },

  clear: function() {
    this.set('presenceSet', {});
    this.set('list', Ember.NativeArray.apply([]));
  },

  add: function(obj) {
    var guid = Ember.guidFor(obj),
        presenceSet = get(this, 'presenceSet'),
        list = get(this, 'list');

    if (guid in presenceSet) { return; }

    presenceSet[guid] = true;
    list.pushObject(obj);
  },

  remove: function(obj) {
    var guid = Ember.guidFor(obj),
        presenceSet = get(this, 'presenceSet'),
        list = get(this, 'list');

    delete presenceSet[guid];
    list.removeObject(obj);
  },

  isEmpty: function() {
    return getPath(this, 'list.length') === 0;
  },

  forEach: function(fn, self) {
    // allow mutation during iteration
    get(this, 'list').slice().forEach(function(item) {
      fn.call(self, item);
    });
  },

  toArray: function() {
    return get(this, 'list').slice();
  }
});

/**
  A Hash stores values indexed by keys. Unlike JavaScript's
  default Objects, the keys of a Hash can be any JavaScript
  object.

  Internally, a Hash has two data structures:

    `keys`: an OrderedSet of all of the existing keys
    `values`: a JavaScript Object indexed by the
      Ember.guidFor(key)

  When a key/value pair is added for the first time, we
  add the key to the `keys` OrderedSet, and create or
  replace an entry in `values`. When an entry is deleted,
  we delete its entry in `keys` and `values`.
*/

var Hash = Ember.Object.extend({
  init: function() {
    set(this, 'keys', OrderedSet.create());
    set(this, 'values', {});
  },

  add: function(key, value) {
    var keys = get(this, 'keys'), values = get(this, 'values');
    var guid = Ember.guidFor(key);

    keys.add(key);
    values[guid] = value;

    return value;
  },

  remove: function(key) {
    var keys = get(this, 'keys'), values = get(this, 'values');
    var guid = Ember.guidFor(key), value;

    keys.remove(key);

    value = values[guid];
    delete values[guid];

    return value;
  },

  fetch: function(key) {
    var values = get(this, 'values');
    var guid = Ember.guidFor(key);

    return values[guid];
  },

  forEach: function(fn, binding) {
    var keys = get(this, 'keys'),
        values = get(this, 'values');

    keys.forEach(function(key) {
      var guid = Ember.guidFor(key);
      fn.call(binding, key, values[guid]);
    });
  }
});

DS.Transaction = Ember.Object.extend({
  init: function() {
    set(this, 'dirty', {
      created: Hash.create(),
      updated: Hash.create(),
      deleted: Hash.create()
    });
  },

  createRecord: function(type, hash) {
    var store = get(this, 'store');

    return store.createRecord(type, hash, this);
  },

  add: function(model) {
    var modelTransaction = get(model, 'transaction');
    ember_assert("Models cannot belong to more than one transaction at a time.", !modelTransaction);

    set(model, 'transaction', this);
  },

  modelBecameDirty: function(kind, model) {
    var dirty = get(get(this, 'dirty'), kind),
        type = model.constructor;

    var models = dirty.fetch(type);

    models = models || dirty.add(type, OrderedSet.create());
    models.add(model);
  },

  modelBecameClean: function(kind, model) {
    var dirty = get(get(this, 'dirty'), kind),
        type = model.constructor;

    var models = dirty.fetch(type);
    models.remove(model);

    set(model, 'transaction', null);
  },

  commit: function() {
    var dirtyMap = get(this, 'dirty');

    var iterate = function(kind, fn, binding) {
      var dirty = get(dirtyMap, kind);

      dirty.forEach(function(type, models) {
        if (models.isEmpty()) { return; }

        var array = [];

        models.forEach(function(model) {
          model.send('willCommit');

          if (get(model, 'isPending') === false) {
            array.push(model);
          }
        });

        fn.call(binding, type, array);
      });
    };

    var commitDetails = {
      updated: {
        eachType: function(fn, binding) { iterate('updated', fn, binding); }
      },

      created: {
        eachType: function(fn, binding) { iterate('created', fn, binding); }
      },

      deleted: {
        eachType: function(fn, binding) { iterate('deleted', fn, binding); }
      }
    };

    var store = get(this, 'store');
    var adapter = get(store, '_adapter');
    if (adapter && adapter.commit) { adapter.commit(store, commitDetails); }
    else { throw fmt("Adapter is either null or do not implement `commit` method", this); }
  }
});
