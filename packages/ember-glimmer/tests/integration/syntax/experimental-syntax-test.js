import { moduleFor, RenderingTest } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';
import { _registerMacros, _experimentalMacros } from 'ember-glimmer';
import { compileArgs } from '@glimmer/runtime';

moduleFor('registerMacros', class extends RenderingTest {
  constructor() {
    let originalMacros = _experimentalMacros.slice();

    _registerMacros((blocks, inlines) => {
      blocks.add('-let', (sexp, builder) => {
        let [,, params, hash, _default] = sexp;
        let args = compileArgs(params, hash, builder);

        builder.putArgs(args);

        builder.labelled(null, b => {
          b.evaluate(_default);
        });
      });
    });

    super();
    this.originalMacros = originalMacros;
  }

  teardown() {
    _experimentalMacros.length = 0;
    this.originalMacros.forEach(macro => _experimentalMacros.push(macro));

    super.teardown();
  }

  ['@test allows registering custom syntax via private API'](assert) {
    this.render(strip`
      {{#-let obj as |bar|}}
        {{bar}}
      {{/-let}}
    `, { obj: 'hello world!'});

    this.assertText('hello world!');
  }
});
