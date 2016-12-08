import { Mixin } from '../../mixin';

QUnit.test('without should create a new mixin excluding named properties', function() {
  let MixinA = Mixin.create({
    foo: 'FOO',
    bar: 'BAR'
  });

  let MixinB = MixinA.without('bar');

  let obj = {};
  MixinB.apply(obj);

  equal(obj.foo, 'FOO', 'should defined foo');
  equal(obj.bar, undefined, 'should not define bar');
});
