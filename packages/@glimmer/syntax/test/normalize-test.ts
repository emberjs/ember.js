import { src, normalize } from '@glimmer/syntax';

QUnit.module('@glimmer/syntax - normalize', () => {
  QUnit.test('normalize leaves blockParams that would shadow keywords', (assert) => {
    const options = {
      strictMode: true,
      locals: ['on'],
      // In the real code, keywords is a manually maintained list
      // of some real, some fake things that are implemented as opcodes,
      // rather than just using (for example) import { on } from 'where-on-lives';
      keywords: ['on'],
      // The default value used for all invocations of precompileJSON
      //   is () => false.... which doesn't seem right.
      //
      // Setting this to "true" also includes "button" in the "locals".
      // Which... could technically be correct? (problem for another time though)
      // But the issue with 'on' is that there is keyword overlap.
      // And normalize drops all locals that are also keywords.
      //
      // It seems this was meant to mean if a value is in js scope or not, but
      // it never got used that way.
      lexicalScope: (name: string) => {
        return options.locals.includes(name);
      },
    };
    const source = new src.Source(`<button {{on "click"}}>Click</button>`);
    const [_ast, locals] = normalize(source, { ...options });

    assert.deepEqual(locals, ['on']);
  });
});
