import { moduleFor, ApplicationTestCase, strip, runTask } from 'internal-test-helpers';

import Service, { service } from '@ember/service';
import { Component, Helper } from '@ember/-internals/glimmer';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';

function expect(value) {
  if (!value) {
    throw new Error(`value missing`);
  }

  return value;
}

// This simuates what the template hot-reloading would do in development mode
// to avoid regressions

moduleFor(
  'Appliation test: template hot reloading',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);

      let didCreateReloader = (reloader) => {
        this.reloader = reloader;
      };

      this.add(
        'service:reloader',
        class extends Service {
          init() {
            super.init(...arguments);
            this.revisions = {};
            this.callbacks = [];

            didCreateReloader(this);
          }

          onReload(callback) {
            this.callbacks.push(callback);
          }

          revisionFor(name) {
            return this.revisions[name];
          }

          invalidate(name) {
            let revision = this.revisions[name];

            if (revision === undefined) {
              revision = 0;
            }

            this.revisions[name] = ++revision;

            this.callbacks.forEach((callback) => callback());
          }
        }
      );

      this.add(
        'helper:hot-reload',
        class extends Helper {
          @service
          reloader;

          init() {
            super.init(...arguments);
            this.reloader.onReload(() => this.recompute());
          }

          compute([name]) {
            let revision = this.reloader.revisionFor(name);

            if (revision === undefined) {
              return name;
            } else {
              return `${name}--hot-reload-${revision}`;
            }
          }
        }
      );
    }

    hotReload(name, compiledTemplate) {
      let reloader = expect(this.reloader);
      let revision = (reloader.revisionFor(name) || 0) + 1;
      let ComponentClass =
        this.applicationInstance.resolveRegistration(`component:${name}`) || null;

      // Create a fresh class/instance so setComponentTemplate doesn't collide
      // with the template already set on the existing class
      let FreshClass;
      if (ComponentClass && 'extend' in ComponentClass) {
        FreshClass = ComponentClass.extend({});
      } else {
        FreshClass = templateOnly();
      }

      this.add(
        `component:${name}--hot-reload-${revision}`,
        setComponentTemplate(compiledTemplate, FreshClass)
      );

      reloader.invalidate(name);
    }

    ['@test hot reloading template-only components']() {
      this.add(
        'template:application',
        precompileTemplate(
          '[{{component (hot-reload "x-foo") name="first"}}][{{component (hot-reload "x-foo") name="second"}}][{{component (hot-reload "x-bar")}}]'
        )
      );

      this.add(
        'component:x-foo',
        setComponentTemplate(precompileTemplate('x-foo: {{@name}}'), templateOnly())
      );

      this.add(
        'component:x-bar',
        setComponentTemplate(precompileTemplate('x-bar'), templateOnly())
      );

      return this.visit('/').then(() => {
        this.assertInnerHTML(strip`
          [x-foo: first]
          [x-foo: second]
          [x-bar]
        `);

        runTask(() => {
          this.hotReload('x-foo', precompileTemplate('<h1>{{@name}}</h1>'));
        });

        this.assertInnerHTML(strip`
          [<h1>first</h1>]
          [<h1>second</h1>]
          [x-bar]
        `);

        runTask(() => {
          this.hotReload('x-bar', precompileTemplate('<h2>wow</h2>'));
        });

        this.assertInnerHTML(strip`
          [<h1>first</h1>]
          [<h1>second</h1>]
          [<h2>wow</h2>]
        `);

        runTask(() => {
          this.hotReload('x-foo', precompileTemplate('<strong>x-foo</strong> <em>{{@name}}</em>'));
        });

        this.assertInnerHTML(strip`
          [<strong>x-foo</strong> <em>first</em>]
          [<strong>x-foo</strong> <em>second</em>]
          [<h2>wow</h2>]
        `);

        runTask(() => {
          this.hotReload('x-foo', precompileTemplate('x-foo: {{@name}}'));
          this.hotReload('x-bar', precompileTemplate('x-bar'));
        });

        this.assertInnerHTML(strip`
          [x-foo: first]
          [x-foo: second]
          [x-bar]
        `);
      });
    }

    ['@test hot reloading class-based components']() {
      this.add(
        'template:application',
        precompileTemplate(
          '[{{component (hot-reload "x-foo") name="first"}}][{{component (hot-reload "x-foo") name="second"}}][{{component (hot-reload "x-bar")}}]'
        )
      );

      let id = 0;

      this.add(
        'component:x-foo',
        setComponentTemplate(
          precompileTemplate('x-foo: {{@name}} ({{this.id}})'),
          class extends Component {
            tagName = '';
            init() {
              super.init(...arguments);
              this.set('id', id++);
            }
          }
        )
      );

      this.add(
        'component:x-bar',
        setComponentTemplate(
          precompileTemplate('x-bar ({{this.id}})'),
          class extends Component {
            tagName = '';
            init() {
              super.init(...arguments);
              this.set('id', id++);
            }
          }
        )
      );

      return this.visit('/').then(() => {
        this.assertInnerHTML(strip`
          [x-foo: first (0)]
          [x-foo: second (1)]
          [x-bar (2)]
        `);

        runTask(() => {
          this.hotReload('x-foo', precompileTemplate('<h1>{{@name}} ({{this.id}})</h1>'));
        });

        this.assertInnerHTML(strip`
          [<h1>first (3)</h1>]
          [<h1>second (4)</h1>]
          [x-bar (2)]
        `);

        runTask(() => {
          this.hotReload('x-bar', precompileTemplate('<h2>wow ({{this.id}})</h2>'));
        });

        this.assertInnerHTML(strip`
          [<h1>first (3)</h1>]
          [<h1>second (4)</h1>]
          [<h2>wow (5)</h2>]
        `);

        runTask(() => {
          this.hotReload(
            'x-foo',
            precompileTemplate('<strong>x-foo</strong> <em>{{@name}} ({{this.id}})</em>')
          );
        });

        this.assertInnerHTML(strip`
          [<strong>x-foo</strong> <em>first (6)</em>]
          [<strong>x-foo</strong> <em>second (7)</em>]
          [<h2>wow (5)</h2>]
        `);

        runTask(() => {
          this.hotReload('x-foo', precompileTemplate('x-foo: {{@name}} ({{this.id}})'));
          this.hotReload('x-bar', precompileTemplate('x-bar ({{this.id}})'));
        });

        this.assertInnerHTML(strip`
          [x-foo: first (8)]
          [x-foo: second (9)]
          [x-bar (10)]
        `);
      });
    }
  }
);
