require("metamorph");
require("ember-views/views/view");

var set = Ember.set, get = Ember.get, getPath = Ember.getPath;

Ember.Metamorph = Ember.Mixin.create({
  isVirtual: true,
  tagName: '',

  init: function() {
    this._super();
    set(this, 'morph', Metamorph());
  },

  beforeRender: function(buffer) {
    var morph = get(this, 'morph');
    buffer.push(morph.startTag());
  },

  afterRender: function(buffer) {
    var morph = get(this, 'morph');
    buffer.push(morph.endTag());
  },

  createElement: function() {
    var buffer = this.renderToBuffer();
    set(this, 'outerHTML', buffer.string());
    this.clearBuffer();
  },

  domManagerClass: Ember.Object.extend({
    remove: function(view) {
      var morph = getPath(this, 'view.morph');
      if (morph.isRemoved()) { return; }
      getPath(this, 'view.morph').remove();
    },

    prepend: function(childView) {
      var view = get(this, 'view');

      childView._insertElementLater(function() {
        var morph = get(view, 'morph');
        morph.prepend(get(childView, 'outerHTML'));
        childView.set('outerHTML', null);
      });
    },

    after: function(nextView) {
      var view = get(this, 'view');

      nextView._insertElementLater(function() {
        var morph = get(view, 'morph');
        morph.after(get(nextView, 'outerHTML'));
        nextView.set('outerHTML', null);
      });
    },

    replace: function() {
      var view = get(this, 'view');
      var morph = getPath(this, 'view.morph');

      view.transitionTo('preRender');
      view.clearRenderedChildren();
      var buffer = view.renderToBuffer();

      Ember.run.schedule('render', this, function() {
        if (get(view, 'isDestroyed')) { return; }
        view._notifyWillInsertElement();
        morph.replaceWith(buffer.string());
        view.transitionTo('inDOM');
        view._notifyDidInsertElement();
      });
    }
  })
});

