import { precompile, compile, template } from 'ember-glimmer-template-compiler';

QUnit.module(`Glimmer Precompile:`);

QUnit.test('returns a string', (assert) => {
  let str = precompile('Hello');
  assert.equal(typeof str, 'string');
});

QUnit.test('when wrapped in a template, precompile is the same as compile', (assert) => {
  // Simulating what happens in a broccoli plugin
  // when it is creating an AMD module. e.g.
  // ...
  // processString(content) {
  //   return `template(${precompile(content)})`;
  // }
  let Precompiled = template(JSON.parse(precompile('Hello')));
  let Compiled = compile('Hello');

  assert.equal(Precompiled.toString(), Compiled.toString(), 'Both return factories');

  let precompiled = new Precompiled({ env: {} });
  let compiled = new Compiled({ env: {} });

  assert.ok(typeof precompiled.spec !== 'string', 'Spec has been parsed');
  assert.ok(typeof compiled.spec !== 'string', 'Spec has been parsed');
});
