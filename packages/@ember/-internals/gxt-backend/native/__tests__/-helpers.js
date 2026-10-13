// Shared harness for the gxt NATIVE layer QUnit modules (native.html). Not a
// test module itself (registers nothing). Renders through the PUBLIC
// `renderComponent` from `@ember/renderer` with a real application owner, the
// way an app (or @ember/test-helpers' render) reaches the native renderer.
import { run } from '@ember/runloop';
import { destroy } from '@ember/destroyable';
import { renderComponent } from '@ember/renderer';
import { buildOwner } from 'internal-test-helpers';

export function setupNativeRendering(hooks) {
  hooks.beforeEach(function () {
    this.owner = buildOwner();
    this.element = document.querySelector('#qunit-fixture');
    this.render = (component, args) => {
      run(() => {
        this.result = renderComponent(component, {
          owner: this.owner,
          into: this.element,
          args,
        });
      });
    };
  });

  hooks.afterEach(function () {
    run(() => {
      if (this.result) this.result.destroy();
      destroy(this.owner);
    });
    this.element.innerHTML = '';
  });
}

/** textContent with whitespace collapsed (gxt control flow leaves comment anchors). */
export function textOf(element) {
  return element.textContent.replace(/\s+/g, ' ').trim();
}

/** innerHTML without comment nodes (gxt `{{#if}}` / `{{#each}}` anchors). */
export function htmlOf(element) {
  return element.innerHTML.replace(/<!--[\s\S]*?-->/g, '');
}
