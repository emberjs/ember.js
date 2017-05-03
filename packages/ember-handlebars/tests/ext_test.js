import {
  handlebarsGetView
} from "ember-handlebars/ext";

QUnit.module("handlebarsGetView");

test("prioritizes path in container over path in keywords", function(){
  expect(2);

  var notTheView = 'not the view',
      theView    = Ember.View.extend(),
      container  = {
        lookupFactory: function(name) {
          equal(name, 'view:things');
          return theView;
        }
      };

  var view = handlebarsGetView([], 'things', container, {keywords: {things: notTheView}});

  equal(view, theView);
});
