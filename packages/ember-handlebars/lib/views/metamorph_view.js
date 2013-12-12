/*jshint newcap:false*/

require("metamorph");
require("ember-views/views/view");

/**
@module ember
@submodule ember-handlebars
*/

var set = Ember.set, get = Ember.get;
var Metamorph = requireModule('metamorph');

function notifyMutationListeners() {
  Ember.run.once(Ember.View, 'notifyMutationListeners');
}

// DOMManager should just abstract dom manipulation between jquery and metamorph
var DOMManager = {
  remove: function(view) {
    view.morph.remove();
    notifyMutationListeners();
  },

  prepend: function(view, html) {
    view.morph.prepend(html);
    notifyMutationListeners();
  },

  after: function(view, html) {
    view.morph.after(html);
    notifyMutationListeners();
  },

  html: function(view, html) {
    view.morph.html(html);
    notifyMutationListeners();
  },

  // This is messed up.
  replace: function(view) {
    var morph = view.morph;

    view.transitionTo('preRender');

    Ember.run.schedule('render', this, function renderMetamorphView() {
      if (view.isDestroying) { return; }

      view.clearRenderedChildren();
      var buffer = view.renderToBuffer();

      view.invokeRecursively(function(view) {
        view.propertyWillChange('element');
      });
      view.triggerRecursively('willInsertElement');

      morph.replaceWith(buffer.string());
      view.transitionTo('inDOM');

      view.invokeRecursively(function(view) {
        view.propertyDidChange('element');
      });
      view.triggerRecursively('didInsertElement');

      notifyMutationListeners();
    });
  },

  empty: function(view) {
    view.morph.html("");
    notifyMutationListeners();
  }
};

// The `morph` and `outerHTML` properties are internal only
// and not observable.

/**
  @class _Metamorph
  @namespace Ember
  @private
*/
Ember._Metamorph = Ember.Mixin.create({
  isVirtual: true,
  tagName: '',

  instrumentName: 'metamorph',

  init: function() {
    this._super();
    this.morph = Metamorph();
    Ember.deprecate('Supplying a tagName to Metamorph views is unreliable and is deprecated. You may be setting the tagName on a Handlebars helper that creates a Metamorph.', !this.tagName);
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
  @extends Ember.CoreView
  @uses Ember._Metamorph
  @private
*/
Ember._SimpleMetamorphView = Ember.CoreView.extend(Ember._Metamorph);

