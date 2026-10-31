import { RenderingTestCase, runAppend } from 'internal-test-helpers';

import { Component } from './helpers';

/**
  Renders the test template through a classic top-level component.

  It is for tests of behavior that exists only below a classic root:
  `parentView`, `childViews`, and the `appendTo` render path.

  @private
*/
export class ClassicRenderingTestCase extends RenderingTestCase {
  render(templateStr, context = {}) {
    let { owner } = this;

    owner.register(
      'template:-top-level',
      this.compile(templateStr, {
        moduleName: '-top-level',
      })
    );

    let attrs = Object.assign({}, context, {
      tagName: '',
      layoutName: '-top-level',
    });

    owner.register('component:-top-level', Component.extend(attrs));

    this.component = owner.lookup('component:-top-level');

    runAppend(this.component);
  }
}
