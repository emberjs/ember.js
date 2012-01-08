DS.RESTAdapter = DS.Adapter.extend({
  createRecord: function(store, type, model) {
    var root = this.rootForType(type);

    var data = {};
    data[root] = model.get('data');

    this.ajax("/" + this.pluralize(root), "POST", {
      data: data,
      success: function(json) {
        store.didCreateRecord(model, json[root]);
      }
    });
  },

  updateRecord: function(store, type, model) {
    var id = model.get('id');
    var root = this.rootForType(type);

    var data = {};
    data[root] = model.get('data');

    var url = ["", this.pluralize(root), id].join("/");

    this.ajax(url, "PUT", {
      data: data,
      success: function(json) {
        store.didUpdateRecord(model, json[root]);
      }
    });
  },

  deleteRecord: function(store, type, model) {
    var id = model.get('id');
    var root = this.rootForType(type);

    var url = ["", this.pluralize(root), id].join("/");

    this.ajax(url, "DELETE", {
      success: function(json) {
        store.didDeleteRecord(model);
      }
    });
  },

  find: function(store, type, id) {
    var root = this.rootForType(type);

    var url = ["", this.pluralize(root), id].join("/");

    this.ajax(url, "GET", {
      success: function(json) {
        store.load(type, json[root]);
      }
    });
  },

  findMany: function(store, type, ids) {
    var root = this.rootForType(type), plural = this.pluralize(root);

    this.ajax("/" + plural, "GET", {
      data: { ids: ids },
      success: function(json) {
        store.loadMany(type, ids, json[plural]);
      }
    });
    var url = "/" + plural;
  },

  findAll: function(store, type) {
    var root = this.rootForType(type), plural = this.pluralize(root);

    this.ajax("/" + plural, "GET", {
      success: function(json) {
        store.loadMany(type, json[plural]);
      }
    });
  },

  findQuery: function(store, type, query, modelArray) {
    var root = this.rootForType(type), plural = this.pluralize(root);

    this.ajax("/" + plural, "GET", {
      data: query,
      success: function(json) {
        modelArray.load(json[plural]);
      }
    });
  },

  // HELPERS

  plurals: {},

  // define a plurals hash in your subclass to define
  // special-case pluralization
  pluralize: function(name) {
    return this.plurals[name] || name + "s";
  },

  rootForType: function(type) {
    if (type.url) { return type.url; }

    // use the last part of the name as the URL
    var parts = type.toString().split(".");
    var name = parts[parts.length - 1];
    console.log(name);
    return name.replace(/([A-Z])/g, '_$1').toLowerCase().slice(1);
  },

  ajax: function(url, type, hash) {
    hash.url = url;
    hash.type = type;
    hash.dataType = "json";

    jQuery.ajax(hash);
  }
});

