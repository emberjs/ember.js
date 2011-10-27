require("metamorph");
require("sproutcore-views/views/view");

var set = SC.set, get = SC.get, getPath = SC.getPath;

SC.Metamorph = SC.Mixin.create({
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

  domManagerClass: SC.Object.extend({
    // It is not possible for a user to directly remove
    // a metamorph view as it is not in the view hierarchy.
    remove: SC.K,

    prepend: function(childView) {
      var view = get(this, 'view');

      childView._insertElementLater(function() {
        var morph = get(view, 'morph');
        var script = SC.$("#" + morph.start);
        script.after(get(childView, 'outerHTML'));
        childView.set('outerHTML', null);
      });
    },

    after: function(nextView) {
      var view = get(this, 'view');

      nextView._insertElementLater(function() {
        var morph = get(view, 'morph');
        var script = SC.$("#" + morph.end);
        script.after(get(nextView, 'outerHTML'));
        nextView.set('outerHTML', null);
      });
    },

    replace: function() {
      var view = get(this, 'view');
      var morph = getPath(this, 'view.morph');

      view.transitionTo('preRender');
      view.clearRenderedChildren();
      var buffer = view.renderToBuffer();

      SC.run.schedule('render', this, function() {
        morph.replaceWith(buffer.string());
        view.transitionTo('inDOM');
      });
    }
  })
});

