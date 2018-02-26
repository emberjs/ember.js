/* globals global */
var path = require('path');
var SimpleDOM = require('simple-dom');
var buildOwner = require('./build-owner');

var distPath = path.join(__dirname, '../../../dist');
var emberPath = path.join(distPath, 'ember.debug');
var templateCompilerPath = path.join(distPath, 'ember-template-compiler');

var templateId;

function clearEmber() {
  delete global.Ember;

  // clear the previously cached version of this module
  delete require.cache[emberPath + '.js'];
  delete require.cache[templateCompilerPath + '.js'];
}

module.exports = function(moduleName) {
  QUnit.module(moduleName, {
    beforeEach: function() {
      var precompile = require(templateCompilerPath).precompile;
      this.compile = function compile(templateString, options) {
        var templateSpec = precompile(templateString, options);
        var template = new Function('return ' + templateSpec)();

        return this.Ember.HTMLBars.template(template);
      };

      var Ember = this.Ember = require(emberPath);

      Ember.testing = true;
      this.run = Ember.run;

      setupComponentTest.call(this);
    },

    afterEach: function() {
      var module = this;

      if (this.component) {
        this.run(function() {
          module.component.destroy();
        });

        this.component = null;
      }

      this.run(this.owner, 'destroy');
      this.owner = null;
      this.Ember = null;

      clearEmber();
    }
  });
};

function setupComponentTest() {
  var module = this;

  module.element = new SimpleDOM.Document();
  module.owner = buildOwner(this.Ember, { resolve: function() {} });
  module.owner.register('service:-document', new SimpleDOM.Document(), { instantiate: false });

  this._hasRendered = false;
  let OutletView = module.owner.factoryFor('view:-outlet');
  var OutletTemplate = module.owner.lookup('template:-outlet');
  module.component = OutletView.create();
  this._outletState = {
    render: {
      owner: module.owner || undefined,
      into: undefined,
      outlet: 'main',
      name: 'application',
      controller: module,
      ViewClass: undefined,
      template: OutletTemplate
    },

    outlets: { }
  };

  templateId = 0;

  this.run(function() {
    module.component.setOutletState(module._outletState);
  });

  module.render = render;
  module.serializeElement = serializeElement;
  module.set = function(property, value) {
    module.run(function() {
      module.Ember.set(module, property, value);
    });
  }
}

function render(_template) {
  var module = this;
  var template = this.compile(_template);

  var templateFullName = 'template:-undertest-' + (++templateId);
  this.owner.register(templateFullName, template);
  var stateToRender = {
    owner: this.owner,
    into: undefined,
    outlet: 'main',
    name: 'index',
    controller: this,
    ViewClass: undefined,
    template: this.owner.lookup(templateFullName),
    outlets: { }
  };

  stateToRender.name = 'index';
  this._outletState.outlets.main = { render: stateToRender, outlets: {} };

  this.run(function() {
    module.component.setOutletState(module._outletState);
  });

  if (!this._hasRendered) {
    this.run(function() {
      module.component.appendTo(module.element);
    });
    this._hasRendered = true;
  }

  return this.serializeElement();
}

function serializeElement() {
  var serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);

  return serializer.serialize(this.element);
}
