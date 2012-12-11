module('system/object/toString');

var guidFor = Ember.guidFor;

test("toString() returns the same value if called twice", function() {
  var Foo = Ember.Namespace.create();
  Foo.toString = function() { return "Foo"; };

  Foo.Bar = Ember.Object.extend();

  equal(Foo.Bar.toString(), "Foo.Bar");
  equal(Foo.Bar.toString(), "Foo.Bar");

  var obj = Foo.Bar.create();

  equal(obj.toString(), "<Foo.Bar:" + guidFor(obj) + ">");
  equal(obj.toString(), "<Foo.Bar:" + guidFor(obj) + ">");

  equal(Foo.Bar.toString(), "Foo.Bar");
});

test('toString includes toStringExtension if defined', function() {
  var Foo = Ember.Object.extend({
        toStringExtension: function(){
          return "fooey";
        }
      }),
      foo = Foo.create(),
      Bar = Ember.Object.extend({}),
      bar = Bar.create();
    // simulate these classes being defined on a Namespace
    Foo[Ember.GUID_KEY+'_name'] = 'Foo';
    Bar[Ember.GUID_KEY+'_name'] = 'Bar';

  equal(bar.toString(), '<Bar:'+Ember.guidFor(bar)+'>', 'does not include toStringExtension part');
  equal(foo.toString(), '<Foo:'+Ember.guidFor(foo)+':fooey>', 'Includes toStringExtension result');
});
