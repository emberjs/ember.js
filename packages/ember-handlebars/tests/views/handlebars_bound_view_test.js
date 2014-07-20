import { SimpleHandlebarsView } from 'ember-handlebars/views/handlebars_bound_view';

QUnit.module('SimpleHandlebarsView');

test('does not render if update is triggured by normalizedValue is the same as the previous normalizedValue', function(){
  var html = null;
  var path = 'foo';
  var pathRoot = { 'foo': 'bar' };
  var isEscaped = false;
  var templateData;
  var view = new SimpleHandlebarsView(path, pathRoot, isEscaped, templateData);

  view.morph.html = function(newHTML) {
    html = newHTML;
  };

  equal(html, null);

  view.update();

  equal(html, 'bar', 'expected call to morph.html with "bar"');
  html = null;

  view.update();

  equal(html, null, 'expected no call to morph.html');

  pathRoot.foo = 'baz'; // change property

  view.update();

  equal(html, 'baz', 'expected call to morph.html with "baz"');
});
