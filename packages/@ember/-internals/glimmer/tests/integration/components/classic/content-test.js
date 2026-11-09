import { DEBUG } from '@glimmer/env';

import { RenderingTestCase, moduleFor } from 'internal-test-helpers';

import { getDebugFunction, setDebugFunction } from '@ember/debug';
import { constructStyleDeprecationMessage } from '@ember/-internals/views';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import { Component } from '../../../utils/helpers';

let warnings, originalWarn;
class StyleTest extends RenderingTestCase {
  constructor() {
    super(...arguments);
    warnings = [];
    originalWarn = getDebugFunction('warn');
    setDebugFunction('warn', function (message, test) {
      if (!test) {
        warnings.push(message);
      }
    });
  }

  teardown() {
    super.teardown(...arguments);
    setDebugFunction('warn', originalWarn);
  }

  assertStyleWarning(style) {
    this.assert.deepEqual(warnings, [constructStyleDeprecationMessage(style)]);
  }
}

if (DEBUG) {
  moduleFor(
    'Inline style tests - warnings (classic component)',
    class extends StyleTest {
      ['@test specifying `attributeBindings: ["style"]` generates a warning']() {
        let FooBarComponent = class extends Component {
          attributeBindings = ['style'];
        };

        this.owner.register(
          'component:foo-bar',
          setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
        );
        let userValue = 'width: 42px';
        this.render('{{foo-bar style=this.userValue}}', {
          userValue,
        });

        this.assertStyleWarning(userValue);
      }
    }
  );
}
