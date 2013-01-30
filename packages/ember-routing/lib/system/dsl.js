/**
@module ember
@submodule ember-routing
*/

function DSL(name, namespace) {
  this.parent = name;
  this.matches = [];
  this.ns = namespace;
}

DSL.prototype = {

  namespace: function(object, callback) {
    Ember.assert("You must send at least the callback", arguments.length > 0);

    if (arguments.length === 1) {
      callback = object;
      object = null;
    }

    this.ns = object;
    Ember.Container.defaultContainer.registerNamespace(this.ns);
    callback.call(this);
  },

  normalizeName: function(name){
    // never wrap application index child with other namespace
    if (!(this.parent === 'application' && name === 'index'))
      name = this.ns instanceof Ember.Namespace ? this.ns.toString().replace(/\./g, '::') + '::' + name : name;
    return name;
  },

  getNamespace: function(name) {
    // never wrap application index child with other namespace
    return this.parent === 'application' && name === 'index' ? null : this.ns;
  },

  resource: function(name, options, callback) {
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (arguments.length === 1) {
      options = {};
    }

    if (typeof options.path !== 'string') {
      options.path = "/" + name;
    }

    name = this.normalizeName(name);
    var ns = this.getNamespace(name);

    if (callback) {
      var dsl = new DSL(name, ns);
      callback.call(dsl);
      this.push(options.path, name, ns, dsl.generate());
    } else {
      this.push(options.path, name, ns);
    }
  },

  push: function(url, name, namespace, callback) {
    if (url === "" || url === "/") { this.explicitIndex = true; }

    this.matches.push([url, name, namespace, callback]);
  },

  route: function(name, options) {
    Ember.assert("You must use `this.resource` to nest", typeof options !== 'function');

    options = options || {};

    if (typeof options.path !== 'string') {
      options.path = "/" + name;
    }

    name = this.normalizeName(name);
    var ns = this.getNamespace(name);

    if (this.parent && this.parent !== 'application') {
      name = this.parent + "." + name;
    }

    // send null as namespace for index in application index child
    this.push(options.path, name, ns);
  },

  generate: function() {
    var dslMatches = this.matches;

    if (!this.explicitIndex) {
      this.route("index", { path: "/" });
    }

    return function(match) {
      for (var i=0, l=dslMatches.length; i<l; i++) {
        var dslMatch = dslMatches[i];
        match(dslMatch[0]).to({ 'handler': dslMatch[1], 'namespace': dslMatch[2] }, dslMatch[3]);
      }
    };
  }
};

DSL.map = function(callback) {
  var dsl = new DSL();
  callback.call(dsl);
  return dsl;
};

Ember.RouterDSL = DSL;
