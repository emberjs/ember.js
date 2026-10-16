/**
 * Writes made while an update renders (compat, GXT_MODE).
 *
 * Glimmer semantics (base-renderer.ts `loopEnd`): a tracked write made in the
 * commit of a render (a modifier's install or update, a classic component's
 * `didUpdate` or `didRender`) makes the renderer invalid, and it renders again
 * before the run loop ends, as many times as it takes. Renders whose commit
 * keeps invalidating them stop after `ENV._RERENDER_LOOP_LIMIT` renders in a
 * row with "infinite rendering invalidation detected".
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { defineSimpleModifier, moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { ENV } from '@ember/-internals/environment';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import Component from '@glimmer/component';
import EmberComponent from '@ember/component';
import { tracked } from '@glimmer/tracking';

moduleFor(
  'GXT writes during an update',
  class extends RenderingTestCase {
    ['@test a tracked write in a modifier update is rendered in the same run loop']() {
      class ParityItem extends Component {
        @tracked isEven = true;

        isInstalled = false;

        // Sets state only on an update, like a classic `didUpdate` hook.
        updateIsEven = defineSimpleModifier((_element: Element, [value]: [number]) => {
          if (this.isInstalled) {
            this.isEven = value % 2 === 0;
          }
          this.isInstalled = true;
        });
      }
      this.owner.register(
        'component:parity-item',
        setComponentTemplate(
          precompileTemplate(
            '<li {{this.updateIsEven @item.value}}>{{#if this.isEven}}{{@item.value}}{{/if}}</li>'
          ),
          ParityItem
        )
      );
      let item = { value: 2 };
      this.render('[{{parity-item item=this.item}}]', { item });
      this.assertText('[2]');

      runTask(() => set(item, 'value', 3));
      this.assertText('[]');

      runTask(() => set(item, 'value', 4));
      this.assertText('[4]');
    }

    ['@test modifier installs that keep switching the branch stop at the rerender limit']() {
      class State {
        @tracked on = true;
      }
      let shared = new State();
      let armed = false;
      // The modifier of each branch switches to the other branch when it is
      // installed. Each render reads a new modifier definition, so every
      // render of a branch installs its modifier again.
      class ToggleBranch extends Component {
        state = shared;
        get turnOff() {
          return defineSimpleModifier(() => {
            if (armed) shared.on = false;
          });
        }
        get turnOn() {
          return defineSimpleModifier(() => {
            if (armed) shared.on = true;
          });
        }
      }
      this.owner.register(
        'component:toggle-branch',
        setComponentTemplate(
          precompileTemplate(
            '<p>{{#if this.state.on}}<b {{this.turnOff}}>on</b>{{else}}<i {{this.turnOn}}>off</i>{{/if}}</p>'
          ),
          ToggleBranch
        )
      );
      this.render('<ToggleBranch />');
      this.assertText('on');

      let limit = ENV._RERENDER_LOOP_LIMIT;
      ENV._RERENDER_LOOP_LIMIT = 10;
      armed = true;
      try {
        this.assert.throws(
          () => runTask(() => (shared.on = false)),
          /infinite rendering invalidation detected/
        );
      } finally {
        armed = false;
        ENV._RERENDER_LOOP_LIMIT = limit;
      }

      runTask(() => (shared.on = false));
      this.assertText('off');

      runTask(() => (shared.on = true));
      this.assertText('on');
    }

    ['@test a write in didUpdate is rendered in the same run loop, however many renders it takes']() {
      let context: object | undefined;
      // Each update raises the value its parent passes, up to 8.
      class BumpValue extends EmberComponent {
        declare value: number;

        didUpdate() {
          if (this.value < 8) set(context!, 'value', this.value + 1);
        }
      }
      this.owner.register(
        'component:bump-value',
        setComponentTemplate(precompileTemplate('{{this.value}}'), BumpValue)
      );
      this.render('{{bump-value value=this.value}}', { value: 1 });
      context = this.context;
      this.assertText('1');

      runTask(() => set(this.context, 'value', 2));
      this.assertText('8');
    }

    ['@test didUpdate writes that keep invalidating stop at the rerender limit']() {
      let context: object | undefined;
      let armed = false;
      // Each update raises the value its parent passes, while armed.
      class BumpValue extends EmberComponent {
        declare value: number;

        didUpdate() {
          if (armed) set(context!, 'value', this.value + 1);
        }
      }
      this.owner.register(
        'component:bump-value',
        setComponentTemplate(precompileTemplate('{{this.value}}'), BumpValue)
      );
      this.render('{{bump-value value=this.value}}', { value: 1 });
      context = this.context;
      this.assertText('1');

      let limit = ENV._RERENDER_LOOP_LIMIT;
      ENV._RERENDER_LOOP_LIMIT = 10;
      armed = true;
      try {
        this.assert.throws(
          () => runTask(() => set(this.context, 'value', 2)),
          /infinite rendering invalidation detected/
        );
      } finally {
        armed = false;
        ENV._RERENDER_LOOP_LIMIT = limit;
      }

      runTask(() => set(this.context, 'value', 100));
      this.assertText('100');
    }
  }
);
