var get = Ember.get, set = Ember.set, getPath = Ember.getPath, fmt = Ember.String.fmt;

DS.Transaction = Ember.Object.extend({
  init: function() {
    set(this, 'buckets', {
      clean:   Ember.Map.create(),
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

    this.adoptRecord(record);
  },

  remove: function(record) {
    var defaultTransaction = getPath(this, 'store.defaultTransaction');

    defaultTransaction.adoptRecord(record);
  },

  /**
    @private

    This method moves a record into a different transaction without the normal
    checks that ensure that the user is not doing something weird, like moving
    a dirty record into a new transaction.

    It is designed for internal use, such as when we are moving a clean record
    into a new transaction when the transaction is committed.

    This method must not be called unless the record is clean.
  */
  adoptRecord: function(record) {
    var oldTransaction = get(record, 'transaction');

    if (oldTransaction) {
      oldTransaction.removeFromBucket('clean', record);
    }

    this.addToBucket('clean', record);
    set(record, 'transaction', this);
  },

  modelBecameDirty: function(kind, record) {
    this.removeFromBucket('clean', record);
    this.addToBucket(kind, record);
  },

  /** @private */
  addToBucket: function(kind, record) {
    var bucket = get(get(this, 'buckets'), kind),
        type = record.constructor;

    var records = bucket.get(type);

    if (!records) {
      records = Ember.OrderedSet.create();
      bucket.set(type, records);
    }

    records.add(record);
  },

  /** @private */
  removeFromBucket: function(kind, record) {
    var bucket = get(get(this, 'buckets'), kind),
        type = record.constructor;

    var records = bucket.get(type);
    records.remove(record);
  },

  modelBecameClean: function(kind, record) {
    this.removeFromBucket(kind, record);

    var defaultTransaction = getPath(this, 'store.defaultTransaction');
    defaultTransaction.adoptRecord(record);
  },

  commit: function() {
    var buckets = get(this, 'buckets');

    var iterate = function(kind, fn, binding) {
      var dirty = get(buckets, kind);

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

    var clean = get(buckets, 'clean');
    var defaultTransaction = get(store, 'defaultTransaction');

    clean.forEach(function(type, records) {
      records.forEach(function(record) {
        this.remove(record);
      }, this);
    }, this);

    if (adapter && adapter.commit) { adapter.commit(store, commitDetails); }
    else { throw fmt("Adapter is either null or do not implement `commit` method", this); }
  }
});
