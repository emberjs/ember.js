import { Mixin } from '../..';

QUnit.test('without should create a new mixin excluding named properties', function(assert) {
  let MixinA = Mixin.create({
    foo: 'FOO',
    bar: 'BAR'
  });

  let MixinB = MixinA.without('bar');

  let obj = {};
  MixinB.apply(obj);

  assert.equal(obj.foo, 'FOO', 'should defined foo');
  assert.equal(obj.bar, undefined, 'should not define bar');
});
