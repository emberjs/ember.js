module("virtual views");

var get = SC.get, set = SC.set;

test("a virtual view does not appear as a view's parentView", function() {
  var rootView = SC.View.create({
    elementId: 'root-view',

    render: function(buffer) {
      buffer.push("<h1>Hi</h1>");
      this.appendChild(virtualView);
    }
  });

  var virtualView = SC.View.create({
    isVirtual: true,
    tagName: '',

    render: function(buffer) {
      buffer.push("<h2>Virtual</h2>");
      this.appendChild(childView);
    }
  });

  var childView = SC.View.create({
    render: function(buffer) {
      buffer.push("<p>Bye!</p>");
    }
  });

  SC.run(function() {
    $("#qunit-fixture").empty();
    rootView.appendTo("#qunit-fixture");
  });

  equal($("#root-view > h2").length, 1, "nodes with '' tagName do not create wrappers");
  equal(get(childView, 'parentView'), rootView);

  var children = get(rootView, 'childViews');

  equal(get(children, 'length'), 1, "there is one child element");
  equal(children.objectAt(0), childView, "the child element skips through the virtual view");
});
