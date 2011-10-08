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
    // It is not possible for a user to directly remove
    // a metamorph view as it is not in the view hierarchy.
    remove: SC.K,

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

