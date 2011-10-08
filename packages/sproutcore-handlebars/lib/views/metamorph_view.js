require("metamorph");
require("sproutcore-views/views/view");

var set = SC.set, get = SC.get, getPath = SC.getPath;

SC.MetamorphView = SC.View.extend({
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

  domManagerClass: SC.Object.extend({
    remove: function() {
      var morph = getPath(this, 'view.morph');
      morph.remove();
    },

    replace: function() {
      var view = get(this, 'view');
      var morph = getPath(this, 'view.morph');

      view.clearRenderedChildren();

      var buffer = view.renderToBuffer();
      morph.replaceWith(buffer.string());
    }
  })
});

