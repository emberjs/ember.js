var get = Ember.get, set = Ember.set, getPath = Ember.getPath, fmt = Ember.String.fmt;

DS.Transaction = Ember.Object.extend({
  init: function() {
    set(this, 'dirty', {
      created: Ember.Map.create(),
      updated: Ember.Map.create(),
      deleted: Ember.Map.create()
    });
  },

  createRecord: function(type, hash) {
    var store = get(this, 'store');

    return store.createRecord(type, hash, this);
  },

  add: function(record) {
    // we could probably make this work if someone has a valid use case. Do you?
    ember_assert("Once a record has changed, you cannot move it into a different transaction", !get(record, 'isDirty'));

    var modelTransaction = get(record, 'transaction'),
        defaultTransaction = getPath(this, 'store.defaultTransaction');

    ember_assert("Models cannot belong to more than one transaction at a time.", modelTransaction === defaultTransaction);

    set(record, 'transaction', this);
  },

  modelBecameDirty: function(kind, model) {
    var dirty = get(get(this, 'dirty'), kind),
        type = model.constructor;

    var models = dirty.get(type);

    if (!models) {
      models = Ember.OrderedSet.create();
      dirty.set(type, models);
    }

    models.add(model);
  },

  modelBecameClean: function(kind, model) {
    var dirty = get(get(this, 'dirty'), kind),
        type = model.constructor,
        defaultTransaction = getPath(this, 'store.defaultTransaction');

    var models = dirty.get(type);
    models.remove(model);

    set(model, 'transaction', defaultTransaction);
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
