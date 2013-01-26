/*jshint newcap:false*/

require("metamorph");
require("ember-views/views/view");

/**
@module ember
@submodule ember-handlebars
*/

var set = Ember.set, get = Ember.get;
var Metamorph = requireModule('metamorph');

// DOMManager should just abstract dom manipulation between jquery and metamorph
var DOMManager = {
  remove: function(view) {
    view.morph.remove();
  },

  prepend: function(view, html) {
    view.morph.prepend(html);
  },

  after: function(view, html) {
    view.morph.after(html);
  },

  html: function(view, html) {
    view.morph.html(html);
  },

  // This is messed up.
  replace: function(view) {
    var morph = view.morph;

    view.transitionTo('preRender');

    Ember.run.schedule('render', this, function() {
      if (view.isDestroying) { return; }

      view.clearRenderedChildren();
      var buffer = view.renderToBuffer();

      view.invokeRecursively(function(view) {
        view.propertyDidChange('element');
      });

      view.triggerRecursively('willInsertElement');
      morph.replaceWith(buffer.string());
      view.transitionTo('inDOM');
      view.triggerRecursively('didInsertElement');
    });
  },

  empty: function(view) {
    view.morph.html("");
  }
};

// The `morph` and `outerHTML` properties are internal only
// and not observable.

/**
  @class _Metamorph
  @namespace Ember
  @extends Ember.Mixin
  @private
*/
Ember._Metamorph = Ember.Mixin.create({
  isVirtual: true,
  tagName: '',

  instrumentName: 'render.metamorph',

  init: function() {
    this._super();
    this.morph = Metamorph();
  },

  beforeRender: function(buffer) {
    buffer.push(this.morph.startTag());
    buffer.pushOpeningTag();
  },

  afterRender: function(buffer) {
    buffer.pushClosingTag();
    buffer.push(this.morph.endTag());
  },

  createElement: function() {
    var buffer = this.renderToBuffer();
    this.outerHTML = buffer.string();
    this.clearBuffer();
  },

  domManager: DOMManager
});

/**
  @class _MetamorphView
  @namespace Ember
  @extends Ember.View
  @uses Ember._Metamorph
  @private
*/
Ember._MetamorphView = Ember.View.extend(Ember._Metamorph);

/**
  @class _SimpleMetamorphView
  @namespace Ember
  @extends Ember.View
  @uses Ember._Metamorph
  @private
*/
Ember._SimpleMetamorphView = Ember.CoreView.extend(Ember._Metamorph);

