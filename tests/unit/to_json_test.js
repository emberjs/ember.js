var get = Ember.get, set = Ember.set;

var store, Comment, adapter;

module("DS.Model - toJSON", {
  setup: function() {
    adapter = DS.Adapter.create();

    store = DS.Store.create({
      isDefaultStore: true,
      adapter: adapter
    });

    Comment = DS.Model.extend();
    Comment.reopen({
      body: DS.attr('string'),
      comments: DS.hasMany(Comment),
      comment: DS.belongsTo(Comment)
    });
  },

  teardown: function() {
    store.destroy();
  }
});

test("if a record is added to another record's hasMany association, it receives a foreign key associated with the new object", function() {
  store.load(Comment, { id: 1, comments: [] });
  store.load(Comment, { id: 2, comments: [] });

  var parentRecord = store.find(Comment, 1);
  var childRecord = store.find(Comment, 2);

  get(parentRecord, 'comments').pushObject(childRecord);
  equal(get(childRecord, 'comment'), parentRecord);

  var json = childRecord.toJSON();

  equal(json.comment_id, 1);
});

test("if a record has a foreign key when loaded, it is included in the toJSON output", function() {
  store.load(Comment, { id: 1, comments: [2] });
  store.load(Comment, { id: 2, comment_id: 1, comments: [] });

  var childRecord = store.find(Comment, 2);

  var json = childRecord.toJSON();

  equal(json.comment_id, 1);
});

test("it can specify a naming convention", function() {
  var convention = {
    keyToJSONKey: function(key) {
      return Ember.String.decamelize(key);
    },

    foreignKey: function(key) {
      return Ember.String.decamelize(key) + '_foo';
    }
  };

  var store = DS.Store.create();

  var OtherModel = DS.Model.extend();
  var Model = DS.Model.extend({
    namingConvention: convention,

    firstName: DS.attr('string'),
    lastName: DS.attr('string', { key: 'lastName' }),

    otherModel: DS.belongsTo(OtherModel)
  });

  store.load(Model, { id: 1, first_name: "Tom", lastName: "Dale", other_model_foo: 2 });
  store.load(OtherModel, { id: 2 });
  var tom = store.find(Model, 1);

  equal(get(tom, 'firstName'), "Tom", "the naming convention is used by default");
  equal(get(tom, 'lastName'), "Dale", "the naming convention is unused if a key is specified");

  var otherModelRecord = store.find(OtherModel, 2);

  ok(otherModelRecord, "precond - finds loaded OtherModel");
  equal(get(tom, 'otherModel'), otherModelRecord, "materializes correct record when retrieving belongsTo association");

  deepEqual(tom.toJSON(), {
    id: 1,
    first_name: "Tom",
    lastName: "Dale",
    other_model_foo: 2
  }, "toJSON takes naming convention into consideration");
});


test("toJSON returns a hash containing the JSON representation of the record", function() {
  var Model = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string', { key: 'lastName' }),
    country: DS.attr('string', { defaultValue: 'US' }),
    isHipster: DS.attr('boolean', { defaultValue: false })
  });

  store.load(Model, { id: 1, first_name: "Tom", lastName: "Dale", other: "none" });
  var record = store.find(Model, 1);

  set(record, 'isHipster', true);

  deepEqual(record.toJSON(), { id: 1, first_name: "Tom", lastName: "Dale", country: 'US', is_hipster: true }, "the data is extracted by attribute");

  record = Model.createRecord({ firstName: "Yehuda", lastName: "Katz", country: null });
  deepEqual(record.toJSON(), { first_name: "Yehuda", lastName: "Katz", country: null, is_hipster: false }, "the data is extracted by attribute");
});

test("toJSON includes associations when the association option is set", function() {
  var PhoneNumber = DS.Model.extend({
    number: DS.attr('string')
  });

  var Contact = DS.Model.extend({
    name: DS.attr('string'),
    phoneNumbers: DS.hasMany(PhoneNumber)
  });

  store.load(PhoneNumber, { id: 7, number: '123' });
  store.load(PhoneNumber, { id: 8, number: '345' });

  store.load(Contact, { id: 1, name: "Chad", phoneNumbers: [7, 8] });

  var record = store.find(Contact, 1);

  deepEqual(record.toJSON(), { id: 1, name: "Chad" }, "precond - associations not included by default");
  deepEqual(record.toJSON({ associations: true }),
            { id: 1, name: "Chad", phoneNumbers: [7,8] },
            "associations are included when association flag is set");

  store.load(PhoneNumber, { id: 9, number: '789' });
  var phoneNumber = store.find(PhoneNumber, 9);

  record.get('phoneNumbers').pushObject(phoneNumber);

  deepEqual(record.toJSON({ associations: true }),
            { id: 1, name: "Chad", phoneNumbers: [7,8,9] },
            "association is updated after editing associations array");
});

test("toJSON includes embedded associations when an association is embedded", function() {
  var PhoneNumber = DS.Model.extend({
    number: DS.attr('string')
  });

  var Contact = DS.Model.extend({
    name: DS.attr('string'),
    phoneNumbers: DS.hasMany(PhoneNumber, {
      embedded: true
    })
  });

  store.load(Contact, { id: 1, name: "Chad", phoneNumbers: [{
    id: 7,
    number: '123'
  },

  {
    id: 8,
    number: '345'
  }]});

  var record = store.find(Contact, 1);

  deepEqual(record.toJSON(), { id: 1, name: "Chad" }, "precond - associations not included by default");
  deepEqual(record.toJSON({ associations: true }),
            { id: 1, name: "Chad", phoneNumbers: [{
                id: 7,
                number: '123'
              },
              {
                id: 8,
                number: '345'
              }
            ]},
            "associations are included when association flag is set");

  store.load(PhoneNumber, { id: 9, number: '789' });
  var phoneNumber = store.find(PhoneNumber, 9);

  record.get('phoneNumbers').pushObject(phoneNumber);

  deepEqual(record.toJSON({ associations: true }),
            { id: 1, name: "Chad", phoneNumbers: [{
                id: 7,
                number: '123'
              },
              {
                id: 8,
                number: '345'
              },
              {
                id: 9,
                number: '789'
              }
            ]},
            "association is updated after editing associations array");
});
