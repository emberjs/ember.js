/**
 * Component arguments (compat, GXT_MODE).
 *
 * Glimmer semantics: a component argument is a reference that the component
 * reads where it uses it, whatever invoked the component:
 *
 * - a template-only component reads `@value` as the argument's value in every
 *   position, also when it is invoked through a path
 *   (`<this.Apply @value={{this.greet}} />`), with `{{component}}` or curried:
 *   a modifier argument is installed where it is used in modifier position
 *   (`<div {{@value "x"}}>`), a helper argument is called (`{{@value "x"}}`)
 *   and an `{{on}}` handler argument is called.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { precompileTemplate } from '@ember/template-compilation';
import templateOnly from '@ember/component/template-only';
import { modifierCapabilities, setComponentTemplate, setModifierManager } from '@glimmer/manager';

// A modifier definition whose manager records each install, with the first
// positional argument, in `calls`.
function recordingModifier(calls: string[]): object {
  class RecordingManager {
    capabilities = modifierCapabilities('3.22');
    createModifier() {
      return {};
    }
    installModifier(_state: object, _element: Element, args: { positional: unknown[] }) {
      calls.push(`install ${args.positional[0]}`);
    }
    updateModifier() {}
    destroyModifier() {}
  }
  return setModifierManager(() => new RecordingManager(), class {});
}

moduleFor(
  'GXT component arguments',
  class extends RenderingTestCase {
    ['@test a modifier argument of a component invoked through a path is installed']() {
      let calls: string[] = [];
      let Apply = setComponentTemplate(
        precompileTemplate('<div {{@value "x"}}></div>'),
        templateOnly()
      );
      this.render('<this.Apply @value={{this.greet}} />', {
        Apply,
        greet: recordingModifier(calls),
      });
      this.assert.deepEqual(calls, ['install x']);
    }

    ['@test a curried modifier argument of a component invoked through a path is installed']() {
      let calls: string[] = [];
      let Apply = setComponentTemplate(
        precompileTemplate('<div {{@value}}></div>'),
        templateOnly()
      );
      this.render('<this.Apply @value={{modifier this.greet "x"}} />', {
        Apply,
        greet: recordingModifier(calls),
      });
      this.assert.deepEqual(calls, ['install x']);
    }

    ['@test a modifier argument of a component invoked with {{component}} is installed']() {
      let calls: string[] = [];
      let Apply = setComponentTemplate(
        precompileTemplate('<div {{@value "x"}}></div>'),
        templateOnly()
      );
      this.render('{{component this.Apply value=this.greet}}', {
        Apply,
        greet: recordingModifier(calls),
      });
      this.assert.deepEqual(calls, ['install x']);
    }

    ['@test a modifier argument of a curried component is installed']() {
      let calls: string[] = [];
      let Apply = setComponentTemplate(
        precompileTemplate('<div {{@value "x"}}></div>'),
        templateOnly()
      );
      this.render('{{#let (component this.Apply) as |C|}}<C @value={{this.greet}} />{{/let}}', {
        Apply,
        greet: recordingModifier(calls),
      });
      this.assert.deepEqual(calls, ['install x']);
    }

    ['@test a helper argument of a component invoked through a path is called']() {
      let Show = setComponentTemplate(precompileTemplate('{{@value "x"}}'), templateOnly());
      this.render('<this.Show @value={{this.shout}} />', {
        Show,
        shout: (s: string) => s.toUpperCase(),
      });
      this.assertText('X');
    }

    ['@test an {{on}} handler argument of a component invoked through a path is called']() {
      let clicks = 0;
      let Button = setComponentTemplate(
        precompileTemplate('<button {{on "click" @onClick}}></button>'),
        templateOnly()
      );
      this.render('<this.Button @onClick={{this.count}} />', {
        Button,
        count: () => clicks++,
      });
      runTask(() => this.element.querySelector('button')!.click());
      this.assert.strictEqual(clicks, 1);
    }
  }
);
