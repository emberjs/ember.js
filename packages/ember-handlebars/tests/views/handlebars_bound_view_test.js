import { SimpleHandlebarsView } from 'ember-handlebars/views/handlebars_bound_view';

QUnit.module('SimpleHandlebarsView');

test('does not render if update is triggured by normalizedValue is the same as the previous normalizedValue', function(){
  var value = null;
  var path = 'foo';
  var pathRoot = { 'foo': 'bar' };
  var isEscaped = true;
  var templateData;
  var view = new SimpleHandlebarsView(path, pathRoot, isEscaped, templateData);
  view._morph = {
    update: function(newValue) {
      value = newValue;
    }
  };

  equal(value, null);

  view.update();

  equal(value, 'bar', 'expected call to morph.update with "bar"');
  value = null;

  view.update();

  equal(value, null, 'expected no call to morph.update');

  pathRoot.foo = 'baz'; // change property

  view.update();

  equal(value, 'baz', 'expected call to morph.update with "baz"');
});
