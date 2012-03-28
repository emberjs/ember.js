var get = Ember.get, set = Ember.set, getPath = Ember.Handlebars.getPath;

require('ember-views/views/view');
require('ember-handlebars/views/metamorph_view');

Ember._BoundHelperView = Ember.View.extend(Ember.Metamorph, {

  context: null,
  options: null,
  property: null,
  // paths of the property that are also observed
  propertyPaths: [],
  
  value: Ember.K,
  
  valueForRender: function() {
    var value = this.value(Ember.getPath(this.context, this.property), this.options);
    if (this.options.escaped) { value = Handlebars.Utils.escapeExpression(value); }
    return value;
  },

  render: function(buffer) {
    buffer.push(this.valueForRender());
  },

  valueDidChange: function() {
    if (this.morph.isRemoved()) { return; }
    this.morph.html(this.valueForRender());
  },

  didInsertElement: function() {
    this.valueDidChange();
  },

  init: function() {
    this._super();
    Ember.addObserver(this.context, this.property, this, 'valueDidChange');
    this.get('propertyPaths').forEach(function(propName) {
        Ember.addObserver(this.context, this.property + '.' + propName, this, 'valueDidChange');
    }, this);
  },
  
  destroy: function() {
    Ember.removeObserver(this.context, this.property, this, 'valueDidChange');
    this.get('propertyPaths').forEach(function(propName) {
        this.context.removeObserver(this.property + '.' + propName, this, 'valueDidChange');
    }, this);
    this._super();
  }

});