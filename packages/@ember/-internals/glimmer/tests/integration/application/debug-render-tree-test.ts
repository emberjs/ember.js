import {
  ApplicationTestCase,
  ModuleBasedTestResolver,
  moduleFor,
  strip,
} from 'internal-test-helpers';

import { ENV } from '@ember/-internals/environment';
import {
  capabilities,
  CapturedRenderNode,
  Component,
  setComponentManager,
  setComponentTemplate,
} from '@ember/-internals/glimmer';
import { EngineInstanceOptions, Owner } from '@ember/-internals/owner';
import { Route } from '@ember/-internals/routing';
import templateOnly from '@ember/component/template-only';
import Controller from '@ember/controller';
import { captureRenderTree } from '@ember/debug';
import Engine from '@ember/engine';
import EngineInstance from '@ember/engine/instance';
import { expect } from '@glimmer/util';
import { SimpleElement, SimpleNode } from '@simple-dom/interface';
import { compile } from 'ember-template-compiler';
import { runTask } from 'internal-test-helpers/lib/run';

interface CapturedBounds {
  parentElement: SimpleElement;
  firstNode: SimpleNode;
  lastNode: SimpleNode;
}

type Expected<T> = T | ((actual: T) => boolean);

function isExpectedFunc<T>(expected: Expected<T>): expected is (actual: T) => boolean {
  return typeof expected === 'function';
}

interface ExpectedRenderNode {
  type: CapturedRenderNode['type'];
  name: CapturedRenderNode['name'];
  args: Expected<CapturedRenderNode['args']>;
  instance: Expected<CapturedRenderNode['instance']>;
  template: Expected<CapturedRenderNode['template']>;
  bounds: Expected<CapturedRenderNode['bounds']>;
  children: Expected<CapturedRenderNode['children']> | ExpectedRenderNode[];
}

if (ENV._DEBUG_RENDER_TREE) {
  moduleFor(
    'Application test: debug render tree',
    class extends ApplicationTestCase {
      _TEMPLATE_ONLY_GLIMMER_COMPONENTS: boolean;

      constructor() {
        super(...arguments);
        this._TEMPLATE_ONLY_GLIMMER_COMPONENTS = ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS;
        ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = true;
      }

      teardown() {
        super.teardown();
        ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = this._TEMPLATE_ONLY_GLIMMER_COMPONENTS;
      }

      async '@test routes'() {
        this.addTemplate('index', 'Index');
        this.addTemplate('foo', 'Foo {{outlet}}');
        this.addTemplate('foo.index', 'index');
        this.addTemplate('foo.inner', '{{@model}}');
        this.addTemplate('bar', 'Bar {{outlet}}');
        this.addTemplate('bar.index', 'index');
        this.addTemplate('bar.inner', '{{@model}}');

        this.router.map(function(this: any) {
          this.route('foo', function(this: any) {
            this.route('inner', { path: '/:model' });
          });
          this.route('foo', function(this: any) {
            this.route('inner', { path: '/:model' });
          });
        });

        class PassThroughRoute extends Route {
          model({ model }: { model: string }) {
            return model;
          }
        }

        this.add('route:foo.inner', PassThroughRoute);
        this.add('route:bar.inner', PassThroughRoute);

        await this.visit('/');

        this.assertRenderTree([
          this.outlet({
            type: 'route-template',
            name: 'index',
            args: { positional: [], named: { model: undefined } },
            instance: this.controllerFor('index'),
            template: 'my-app/templates/index.hbs',
            bounds: this.elementBounds(this.element),
            children: [],
          }),
        ]);

        await this.visit('/foo');

        this.assertRenderTree([
          this.outlet({
            type: 'route-template',
            name: 'foo',
            args: { positional: [], named: { model: undefined } },
            instance: this.controllerFor('foo'),
            template: 'my-app/templates/foo.hbs',
            bounds: this.elementBounds(this.element),
            children: [
              this.outlet({
                type: 'route-template',
                name: 'foo.index',
                args: { positional: [], named: { model: undefined } },
                instance: this.controllerFor('foo.index'),
                template: 'my-app/templates/foo/index.hbs',
                bounds: this.nodeBounds(this.element.lastChild),
                children: [],
              }),
            ],
          }),
        ]);

        await this.visit('/foo/wow');

        this.assertRenderTree([
          this.outlet({
            type: 'route-template',
            name: 'foo',
            args: { positional: [], named: { model: undefined } },
            instance: this.controllerFor('foo'),
            template: 'my-app/templates/foo.hbs',
            bounds: this.elementBounds(this.element),
            children: [
              this.outlet({
                type: 'route-template',
                name: 'foo.inner',
                args: { positional: [], named: { model: 'wow' } },
                instance: this.controllerFor('foo.inner'),
                template: 'my-app/templates/foo/inner.hbs',
                bounds: this.nodeBounds(this.element.lastChild),
                children: [],
              }),
            ],
          }),
        ]);

        await this.visit('/foo/zomg');

        this.assertRenderTree([
          this.outlet({
            type: 'route-template',
            name: 'foo',
            args: { positional: [], named: { model: undefined } },
            instance: this.controllerFor('foo'),
            template: 'my-app/templates/foo.hbs',
            bounds: this.elementBounds(this.element),
            children: [
              this.outlet({
                type: 'route-template',
                name: 'foo.inner',
                args: { positional: [], named: { model: 'zomg' } },
                instance: this.controllerFor('foo.inner'),
                template: 'my-app/templates/foo/inner.hbs',
                bounds: this.nodeBounds(this.element.lastChild),
                children: [],
              }),
            ],
          }),
        ]);
      }

      async '@test named outlets'() {
        this.addTemplate(
          'application',
          strip`
            <div id="header">{{outlet "header"}}</div>
            {{outlet}}
          `
        );
        this.addTemplate('header', 'header');
        this.addTemplate('index', 'index');

        this.add(
          'controller:index',
          class extends Controller {
            queryParams = ['showHeader'];
            showHeader = false;
          }
        );

        interface Model {
          showHeader: boolean;
        }

        this.add(
          'route:index',
          class extends Route {
            queryParams = {
              showHeader: {
                refreshModel: true,
              },
            };

            model({ showHeader }: Model): Model {
              return { showHeader };
            }

            setupController(controller: Controller, { showHeader }: Model): void {
              controller.setProperties({ showHeader });
            }

            renderTemplate(_: Controller, { showHeader }: Model): void {
              this.render();

              if (showHeader) {
                this.render('header', { outlet: 'header' });
              } else {
                this.disconnectOutlet('header');
              }
            }
          }
        );

        await this.visit('/');

        this.assertRenderTree([
          this.outlet({
            type: 'route-template',
            name: 'index',
            args: { positional: [], named: { model: { showHeader: false } } },
            instance: this.controllerFor('index'),
            template: 'my-app/templates/index.hbs',
            bounds: this.nodeBounds(this.element.lastChild),
            children: [],
          }),
        ]);

        await this.visit('/?showHeader');

        this.assertRenderTree([
          this.outlet('header', {
            type: 'route-template',
            name: 'header',
            args: { positional: [], named: { model: { showHeader: true } } },
            instance: this.controllerFor('index'),
            template: 'my-app/templates/header.hbs',
            bounds: this.elementBounds(this.element.firstChild),
            children: [],
          }),
          this.outlet({
            type: 'route-template',
            name: 'index',
            args: { positional: [], named: { model: { showHeader: true } } },
            instance: this.controllerFor('index'),
            template: 'my-app/templates/index.hbs',
            bounds: this.nodeBounds(this.element.lastChild),
            children: [],
          }),
        ]);

        await this.visit('/');

        this.assertRenderTree([
          this.outlet({
            type: 'route-template',
            name: 'index',
            args: { positional: [], named: { model: { showHeader: false } } },
            instance: this.controllerFor('index'),
            template: 'my-app/templates/index.hbs',
            bounds: this.nodeBounds(this.element.lastChild),
            children: [],
          }),
        ]);
      }

      async '@test {{mount}}'() {
        this.addTemplate(
          'application',
          strip`
            <div id="static">{{mount "foo"}}</div>
            <div id="dynamic">{{mount this.engineName}}</div>
            {{#if this.showMore}}
              <div id="static-with-model">{{mount "foo" model=this.engineModel}}</div>
              <div id="dynamic-with-model">{{mount this.engineName model=this.engineModel}}</div>
            {{/if}}
          `
        );

        this.add(
          'engine:foo',
          class extends Engine {
            isFooEngine = true;
            Resolver = ModuleBasedTestResolver;

            init() {
              super.init(...arguments);
              this.register(
                'template:application',
                compile(
                  strip`
                    {{#if @model}}
                      <InspectModel @model={{@model}} />
                    {{/if}}
                  `,
                  {
                    moduleName: 'foo/templates/application.hbs',
                  }
                )
              );
              this.register(
                'template:components/inspect-model',
                compile('{{@model}}', {
                  moduleName: 'foo/components/inspect-model.hbs',
                })
              );
            }

            buildInstance(options?: EngineInstanceOptions): EngineInstance {
              let instance = super.buildInstance(options);
              instance['isFooEngineInstance'] = true;
              return instance;
            }
          }
        );

        this.add(
          'engine:bar',
          class extends Engine {
            Resolver = ModuleBasedTestResolver;

            init() {
              super.init(...arguments);
              this.register(
                'template:application',
                compile(
                  strip`
                    {{#if @model}}
                      <InspectModel @model={{@model}} />
                    {{/if}}
                  `,
                  {
                    moduleName: 'bar/templates/application.hbs',
                  }
                )
              );
              this.register(
                'template:components/inspect-model',
                compile('{{@model}}', {
                  moduleName: 'bar/components/inspect-model.hbs',
                })
              );
            }

            buildInstance(options?: EngineInstanceOptions): EngineInstance {
              let instance = super.buildInstance(options);
              instance['isBarEngineInstance'] = true;
              return instance;
            }
          }
        );

        await this.visit('/');

        this.assertRenderTree([
          {
            type: 'engine',
            name: 'foo',
            args: { positional: [], named: {} },
            instance: (instance: object) => instance['isFooEngineInstance'] === true,
            template: null,
            bounds: this.elementBounds(this.$('#static')[0]),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: {} },
                instance: (instance: object) =>
                  instance.toString() === '(generated application controller)',
                template: 'foo/templates/application.hbs',
                bounds: this.elementBounds(this.$('#static')[0]),
                children: [],
              },
            ],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('engineName', 'bar');
        });

        this.assertRenderTree([
          {
            type: 'engine',
            name: 'foo',
            args: { positional: [], named: {} },
            instance: (instance: object) => instance['isFooEngineInstance'] === true,
            template: null,
            bounds: this.elementBounds(this.$('#static')[0]),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: {} },
                instance: (instance: object) =>
                  instance.toString() === '(generated application controller)',
                template: 'foo/templates/application.hbs',
                bounds: this.elementBounds(this.$('#static')[0]),
                children: [],
              },
            ],
          },
          {
            type: 'engine',
            name: 'bar',
            args: { positional: [], named: {} },
            instance: (instance: object) => instance['isBarEngineInstance'] === true,
            template: null,
            bounds: this.elementBounds(this.$('#dynamic')[0]),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: {} },
                instance: (instance: object) =>
                  instance.toString() === '(generated application controller)',
                template: 'bar/templates/application.hbs',
                bounds: this.elementBounds(this.$('#dynamic')[0]),
                children: [],
              },
            ],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('engineName', undefined);
        });

        this.assertRenderTree([
          {
            type: 'engine',
            name: 'foo',
            args: { positional: [], named: {} },
            instance: (instance: object) => instance['isFooEngineInstance'] === true,
            template: null,
            bounds: this.elementBounds(this.$('#static')[0]),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: {} },
                instance: (instance: object) =>
                  instance.toString() === '(generated application controller)',
                template: 'foo/templates/application.hbs',
                bounds: this.elementBounds(this.$('#static')[0]),
                children: [],
              },
            ],
          },
        ]);

        let model = {
          toString() {
            return 'some model';
          },
        };

        runTask(() => {
          this.controllerFor('application').setProperties({
            showMore: true,
            engineModel: model,
          });
        });

        this.assertRenderTree([
          {
            type: 'engine',
            name: 'foo',
            args: { positional: [], named: {} },
            instance: (instance: object) => instance['isFooEngineInstance'] === true,
            template: null,
            bounds: this.elementBounds(this.$('#static')[0]),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: {} },
                instance: (instance: object) =>
                  instance.toString() === '(generated application controller)',
                template: 'foo/templates/application.hbs',
                bounds: this.elementBounds(this.$('#static')[0]),
                children: [],
              },
            ],
          },
          {
            type: 'engine',
            name: 'foo',
            args: { positional: [], named: { model } },
            instance: (instance: object) => instance['isFooEngineInstance'] === true,
            template: null,
            bounds: this.elementBounds(this.$('#static-with-model')[0]),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: { model } },
                instance: (instance: object) =>
                  instance.toString() === '(generated application controller)',
                template: 'foo/templates/application.hbs',
                bounds: this.elementBounds(this.$('#static-with-model')[0]),
                children: [
                  {
                    type: 'component',
                    name: 'inspect-model',
                    args: { positional: [], named: { model } },
                    instance: null,
                    template: 'foo/components/inspect-model.hbs',
                    bounds: this.nodeBounds(this.$('#static-with-model')[0].lastChild),
                    children: [],
                  },
                ],
              },
            ],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('engineName', 'bar');
        });

        this.assertRenderTree([
          {
            type: 'engine',
            name: 'foo',
            args: { positional: [], named: {} },
            instance: (instance: object) => instance['isFooEngineInstance'] === true,
            template: null,
            bounds: this.elementBounds(this.$('#static')[0]),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: {} },
                instance: (instance: object) =>
                  instance.toString() === '(generated application controller)',
                template: 'foo/templates/application.hbs',
                bounds: this.elementBounds(this.$('#static')[0]),
                children: [],
              },
            ],
          },
          {
            type: 'engine',
            name: 'bar',
            args: { positional: [], named: {} },
            instance: (instance: object) => instance['isBarEngineInstance'] === true,
            template: null,
            bounds: this.elementBounds(this.$('#dynamic')[0]),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: {} },
                instance: (instance: object) =>
                  instance.toString() === '(generated application controller)',
                template: 'bar/templates/application.hbs',
                bounds: this.elementBounds(this.$('#dynamic')[0]),
                children: [],
              },
            ],
          },
          {
            type: 'engine',
            name: 'foo',
            args: { positional: [], named: { model } },
            instance: (instance: object) => instance['isFooEngineInstance'] === true,
            template: null,
            bounds: this.elementBounds(this.$('#static-with-model')[0]),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: { model } },
                instance: (instance: object) =>
                  instance.toString() === '(generated application controller)',
                bounds: this.elementBounds(this.$('#static-with-model')[0]),
                template: 'foo/templates/application.hbs',
                children: [
                  {
                    type: 'component',
                    name: 'inspect-model',
                    args: { positional: [], named: { model } },
                    instance: null,
                    template: 'foo/components/inspect-model.hbs',
                    bounds: this.nodeBounds(this.$('#static-with-model')[0].lastChild),
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            type: 'engine',
            name: 'bar',
            args: { positional: [], named: { model } },
            instance: (instance: object) => instance['isBarEngineInstance'] === true,
            template: null,
            bounds: this.elementBounds(this.$('#dynamic-with-model')[0]),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: { model } },
                instance: (instance: object) =>
                  instance.toString() === '(generated application controller)',
                template: 'bar/templates/application.hbs',
                bounds: this.elementBounds(this.$('#dynamic-with-model')[0]),
                children: [
                  {
                    type: 'component',
                    name: 'inspect-model',
                    args: { positional: [], named: { model } },
                    instance: null,
                    template: 'bar/components/inspect-model.hbs',
                    bounds: this.nodeBounds(this.$('#dynamic-with-model')[0].lastChild),
                    children: [],
                  },
                ],
              },
            ],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').setProperties({
            showMore: false,
            engineName: undefined,
          });
        });

        this.assertRenderTree([
          {
            type: 'engine',
            name: 'foo',
            args: { positional: [], named: {} },
            instance: (instance: object) => instance['isFooEngineInstance'] === true,
            template: null,
            bounds: this.elementBounds(this.$('#static')[0]),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: {} },
                instance: (instance: object) =>
                  instance.toString() === '(generated application controller)',
                template: 'foo/templates/application.hbs',
                bounds: this.elementBounds(this.$('#static')[0]),
                children: [],
              },
            ],
          },
        ]);
      }

      async '@test routable engine'() {
        this.addTemplate('index', 'Index');

        let instance: EngineInstance;

        this.add(
          'engine:foo',
          class extends Engine {
            isFooEngine = true;
            Resolver = ModuleBasedTestResolver;

            init() {
              super.init(...arguments);
              this.register(
                'template:application',
                compile(
                  strip`
                    {{outlet}}

                    {{#if this.message}}
                      <Hello @message={{this.message}} />
                    {{/if}}
                  `,
                  {
                    moduleName: 'foo/templates/application.hbs',
                  }
                )
              );
              this.register(
                'template:index',
                compile('Foo', {
                  moduleName: 'foo/templates/index.hbs',
                })
              );
              this.register(
                'template:components/hello',
                compile('<span>Hello {{@message}}</span>', {
                  moduleName: 'foo/components/hello.hbs',
                })
              );
            }

            buildInstance(options?: EngineInstanceOptions): EngineInstance {
              return (instance = super.buildInstance(options));
            }
          }
        );

        this.router.map(function(this: any) {
          this.mount('foo');
        });

        this.add('route-map:foo', function() {});

        await this.visit('/');

        this.assertRenderTree([
          this.outlet({
            type: 'route-template',
            name: 'index',
            args: { positional: [], named: { model: undefined } },
            instance: this.controllerFor('index'),
            template: 'my-app/templates/index.hbs',
            bounds: this.elementBounds(this.element),
            children: [],
          }),
        ]);

        await this.visit('/foo');

        this.assertRenderTree([
          this.outlet({
            type: 'engine',
            name: 'foo',
            args: { positional: [], named: {} },
            instance: instance!,
            template: null,
            bounds: this.elementBounds(this.element),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: { model: undefined } },
                instance: instance!.lookup('controller:application'),
                template: 'foo/templates/application.hbs',
                bounds: this.elementBounds(this.element),
                children: [
                  this.outlet({
                    type: 'route-template',
                    name: 'index',
                    args: { positional: [], named: { model: undefined } },
                    instance: instance!.lookup('controller:index'),
                    template: 'foo/templates/index.hbs',
                    bounds: this.nodeBounds(this.element.firstChild),
                    children: [],
                  }),
                ],
              },
            ],
          }),
        ]);

        runTask(() => {
          let controller = instance!.lookup<Controller>('controller:application')!;
          controller.set('message', 'World');
        });

        this.assertRenderTree([
          this.outlet({
            type: 'engine',
            name: 'foo',
            args: { positional: [], named: {} },
            instance: instance!,
            template: null,
            bounds: this.elementBounds(this.element),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: { model: undefined } },
                instance: instance!.lookup('controller:application'),
                template: 'foo/templates/application.hbs',
                bounds: this.elementBounds(this.element),
                children: [
                  this.outlet({
                    type: 'route-template',
                    name: 'index',
                    args: { positional: [], named: { model: undefined } },
                    instance: instance!.lookup('controller:index'),
                    template: 'foo/templates/index.hbs',
                    bounds: this.nodeBounds(this.element.firstChild),
                    children: [],
                  }),
                  {
                    type: 'component',
                    name: 'hello',
                    args: { positional: [], named: { message: 'World' } },
                    instance: null,
                    template: 'foo/components/hello.hbs',
                    bounds: this.nodeBounds(this.element.lastChild),
                    children: [],
                  },
                ],
              },
            ],
          }),
        ]);

        runTask(() => {
          let controller = instance!.lookup<Controller>('controller:application')!;
          controller.set('message', undefined);
        });

        this.assertRenderTree([
          this.outlet({
            type: 'engine',
            name: 'foo',
            args: { positional: [], named: {} },
            instance: instance!,
            template: null,
            bounds: this.elementBounds(this.element),
            children: [
              {
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: { model: undefined } },
                instance: instance!.lookup('controller:application'),
                template: 'foo/templates/application.hbs',
                bounds: this.elementBounds(this.element),
                children: [
                  this.outlet({
                    type: 'route-template',
                    name: 'index',
                    args: { positional: [], named: { model: undefined } },
                    instance: instance!.lookup('controller:index'),
                    template: 'foo/templates/index.hbs',
                    bounds: this.nodeBounds(this.element.firstChild),
                    children: [],
                  }),
                ],
              },
            ],
          }),
        ]);

        await this.visit('/');

        this.assertRenderTree([
          this.outlet({
            type: 'route-template',
            name: 'index',
            args: { positional: [], named: { model: undefined } },
            instance: this.controllerFor('index'),
            template: 'my-app/templates/index.hbs',
            bounds: this.elementBounds(this.element),
            children: [],
          }),
        ]);
      }

      async '@test template-only components'() {
        this.addTemplate(
          'application',
          strip`
            <HelloWorld @name="first" />

            {{#if this.showSecond}}
              <HelloWorld @name="second" />
            {{/if}}
          `
        );

        this.addComponent('hello-world', {
          ComponentClass: null,
          template: 'Hello World',
        });

        await this.visit('/');

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: null,
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', true);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: null,
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'second' } },
            instance: null,
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.lastChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', false);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: null,
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);
      }

      async '@feature(EMBER_GLIMMER_SET_COMPONENT_TEMPLATE) templateOnlyComponent()'() {
        this.addTemplate(
          'application',
          strip`
            <HelloWorld @name="first" />

            {{#if this.showSecond}}
              <HelloWorld @name="second" />
            {{/if}}
          `
        );

        this.addComponent('hello-world', {
          ComponentClass: templateOnly(),
          template: 'Hello World',
        });

        await this.visit('/');

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: null,
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', true);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: null,
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'second' } },
            instance: null,
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.lastChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', false);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: null,
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);
      }

      async '@feature(EMBER_GLIMMER_SET_COMPONENT_TEMPLATE) templateOnlyComponent() + setComponentTemplate()'() {
        this.addTemplate(
          'application',
          strip`
            <HelloWorld @name="first" />

            {{#if this.showSecond}}
              <HelloWorld @name="second" />
            {{/if}}
          `
        );

        this.addComponent('hello-world', {
          ComponentClass: setComponentTemplate(
            compile('Hello World', { moduleName: 'my-app/components/hello-world.hbs' }),
            templateOnly()
          ),
        });

        await this.visit('/');

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: null,
            template: 'my-app/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', true);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: null,
            template: 'my-app/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'second' } },
            instance: null,
            template: 'my-app/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.lastChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', false);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: null,
            template: 'my-app/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);
      }

      async '@test classic components'() {
        this.addTemplate(
          'application',
          strip`
            <HelloWorld @name="first" />

            {{#if this.showSecond}}
              <HelloWorld @name="second" />
            {{/if}}
          `
        );

        this.addComponent('hello-world', {
          ComponentClass: Component.extend(),
          template: 'Hello World',
        });

        await this.visit('/');

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: (instance: object) => instance['name'] === 'first',
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', true);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: (instance: object) => instance['name'] === 'first',
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'second' } },
            instance: (instance: object) => instance['name'] === 'second',
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.lastChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', false);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: (instance: object) => instance['name'] === 'first',
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);
      }

      async '@test custom components'() {
        this.addTemplate(
          'application',
          strip`
            <HelloWorld @name="first" />

            {{#if this.showSecond}}
              <HelloWorld @name="second" />
            {{/if}}
          `
        );

        this.addComponent('hello-world', {
          ComponentClass: setComponentManager(_owner => {
            return {
              capabilities: capabilities('3.13', {}),

              createComponent(_, { named: { name } }) {
                return { name };
              },

              getContext(instances) {
                return instances;
              },
            };
          }, {}),
          template: 'Hello World',
        });

        await this.visit('/');

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: (instance: object) => instance['name'] === 'first',
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', true);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: (instance: object) => instance['name'] === 'first',
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'second' } },
            instance: (instance: object) => instance['name'] === 'second',
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.lastChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', false);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'hello-world',
            args: { positional: [], named: { name: 'first' } },
            instance: (instance: object) => instance['name'] === 'first',
            template: 'my-app/templates/components/hello-world.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);
      }

      async '@test <Input> components'() {
        this.addTemplate(
          'application',
          strip`
            <Input @type="text" @value="first" />

            {{#if this.showSecond}}
              <Input @type="checkbox" @checked={{false}} />
            {{/if}}
          `
        );

        await this.visit('/');

        let target = this.controllerFor('application');

        this.assertRenderTree([
          {
            type: 'component',
            name: 'input',
            args: args => args.named.type === 'text' && '__ARGS__' in args.named,
            instance: (instance: object) => instance['type'] === 'text',
            template: 'packages/@ember/-internals/glimmer/lib/templates/input.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [
              {
                type: 'component',
                name: '-text-field',
                args: { positional: [], named: { target, type: 'text', value: 'first' } },
                instance: (instance: object) => instance['value'] === 'first',
                template: 'packages/@ember/-internals/glimmer/lib/templates/empty.hbs',
                bounds: this.nodeBounds(this.element.firstChild),
                children: [],
              },
            ],
          },
        ]);

        runTask(() => target.set('showSecond', true));

        this.assertRenderTree([
          {
            type: 'component',
            name: 'input',
            args: args => args.named.type === 'text' && '__ARGS__' in args.named,
            instance: (instance: object) => instance['type'] === 'text',
            template: 'packages/@ember/-internals/glimmer/lib/templates/input.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [
              {
                type: 'component',
                name: '-text-field',
                args: { positional: [], named: { target, type: 'text', value: 'first' } },
                instance: (instance: object) => instance['value'] === 'first',
                template: 'packages/@ember/-internals/glimmer/lib/templates/empty.hbs',
                bounds: this.nodeBounds(this.element.firstChild),
                children: [],
              },
            ],
          },
          {
            type: 'component',
            name: 'input',
            args: args => args.named.type === 'checkbox' && '__ARGS__' in args.named,
            instance: (instance: object) => instance['type'] === 'checkbox',
            template: 'packages/@ember/-internals/glimmer/lib/templates/input.hbs',
            bounds: this.nodeBounds(this.element.lastChild),
            children: [
              {
                type: 'component',
                name: '-checkbox',
                args: { positional: [], named: { target, type: 'checkbox', checked: false } },
                instance: (instance: object) => instance['checked'] === false,
                template: 'packages/@ember/-internals/glimmer/lib/templates/empty.hbs',
                bounds: this.nodeBounds(this.element.lastChild),
                children: [],
              },
            ],
          },
        ]);

        runTask(() => target.set('showSecond', false));

        this.assertRenderTree([
          {
            type: 'component',
            name: 'input',
            args: args => args.named.type === 'text' && '__ARGS__' in args.named,
            instance: (instance: object) => instance['type'] === 'text',
            template: 'packages/@ember/-internals/glimmer/lib/templates/input.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [
              {
                type: 'component',
                name: '-text-field',
                args: { positional: [], named: { target, type: 'text', value: 'first' } },
                instance: (instance: object) => instance['value'] === 'first',
                template: 'packages/@ember/-internals/glimmer/lib/templates/empty.hbs',
                bounds: this.nodeBounds(this.element.firstChild),
                children: [],
              },
            ],
          },
        ]);
      }

      async '@test <Textarea> components'() {
        this.addTemplate(
          'application',
          strip`
            <Textarea @value="first" />

            {{#if this.showSecond}}
              <Textarea @value="second" />
            {{/if}}
          `
        );

        await this.visit('/');

        this.assertRenderTree([
          {
            type: 'component',
            name: 'textarea',
            args: { positional: [], named: { value: 'first' } },
            instance: (instance: object) => instance['value'] === 'first',
            bounds: this.nodeBounds(this.element.firstChild),
            template: 'packages/@ember/-internals/glimmer/lib/templates/empty.hbs',
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', true);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'textarea',
            args: { positional: [], named: { value: 'first' } },
            instance: (instance: object) => instance['value'] === 'first',
            template: 'packages/@ember/-internals/glimmer/lib/templates/empty.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
          {
            type: 'component',
            name: 'textarea',
            args: { positional: [], named: { value: 'second' } },
            instance: (instance: object) => instance['value'] === 'second',
            template: 'packages/@ember/-internals/glimmer/lib/templates/empty.hbs',
            bounds: this.nodeBounds(this.element.lastChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', false);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'textarea',
            args: { positional: [], named: { value: 'first' } },
            instance: (instance: object) => instance['value'] === 'first',
            template: 'packages/@ember/-internals/glimmer/lib/templates/empty.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);
      }

      async '@test <LinkTo> components'() {
        this.addTemplate(
          'application',
          strip`
            <LinkTo @id="first" @route="index">Hello World</LinkTo>

            {{#if this.showSecond}}
              <LinkTo @id="second" @route="index">Hello World</LinkTo>
            {{/if}}
          `
        );

        await this.visit('/');

        this.assertRenderTree([
          {
            type: 'component',
            name: 'link-to',
            args: { positional: [], named: { id: 'first', route: 'index' } },
            instance: (instance: object) => instance['id'] === 'first',
            template: 'packages/@ember/-internals/glimmer/lib/templates/link-to.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', true);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'link-to',
            args: { positional: [], named: { id: 'first', route: 'index' } },
            instance: (instance: object) => instance['id'] === 'first',
            template: 'packages/@ember/-internals/glimmer/lib/templates/link-to.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
          {
            type: 'component',
            name: 'link-to',
            args: { positional: [], named: { id: 'second', route: 'index' } },
            instance: (instance: object) => instance['id'] === 'second',
            template: 'packages/@ember/-internals/glimmer/lib/templates/link-to.hbs',
            bounds: this.nodeBounds(this.element.lastChild),
            children: [],
          },
        ]);

        runTask(() => {
          this.controllerFor('application').set('showSecond', false);
        });

        this.assertRenderTree([
          {
            type: 'component',
            name: 'link-to',
            args: { positional: [], named: { id: 'first', route: 'index' } },
            instance: (instance: object) => instance['id'] === 'first',
            template: 'packages/@ember/-internals/glimmer/lib/templates/link-to.hbs',
            bounds: this.nodeBounds(this.element.firstChild),
            children: [],
          },
        ]);
      }

      get owner(): Owner {
        return this.applicationInstance;
      }

      outlet(
        name: string,
        node: ExpectedRenderNode & { type: 'engine' | 'route-template' }
      ): ExpectedRenderNode;
      outlet(node: ExpectedRenderNode & { type: 'engine' | 'route-template' }): ExpectedRenderNode;
      outlet(
        nodeOrName: string | ExpectedRenderNode & { type: 'engine' | 'route-template' },
        node?: ExpectedRenderNode & { type: 'engine' | 'route-template' }
      ): ExpectedRenderNode {
        let name: string;

        if (typeof nodeOrName === 'string') {
          name = nodeOrName;
          node = node!;
        } else {
          name = 'main';
          node = nodeOrName;
        }

        return {
          type: 'outlet',
          name,
          instance: undefined,
          args: { positional: [], named: {} },
          template: null,
          bounds: node.bounds,
          children: [node],
        };
      }

      nodeBounds(node: Node): CapturedBounds {
        return {
          parentElement: (expect(
            node.parentNode,
            'BUG: detached node'
          ) as SimpleNode) as SimpleElement,
          firstNode: node as SimpleNode,
          lastNode: node as SimpleNode,
        };
      }

      elementBounds(element: Element): CapturedBounds {
        return {
          parentElement: element as SimpleElement,
          firstNode: element.firstChild! as SimpleNode,
          lastNode: element.lastChild! as SimpleNode,
        };
      }

      assertRenderTree(expected: ExpectedRenderNode[]): void {
        let outlet = 'packages/@ember/-internals/glimmer/lib/templates/outlet.hbs';
        let actual = captureRenderTree(this.owner);
        let wrapped: ExpectedRenderNode[] = [
          this.outlet({
            type: 'route-template',
            name: '-top-level',
            args: { positional: [], named: {} },
            instance: undefined,
            template: outlet,
            bounds: this.nodeBounds(this.element),
            children: [
              this.outlet({
                type: 'route-template',
                name: 'application',
                args: { positional: [], named: { model: undefined } },
                instance: this.controllerFor('application'),
                template: this.owner.hasRegistration('template:application')
                  ? 'my-app/templates/application.hbs'
                  : outlet,
                bounds: this.elementBounds(this.element),
                children: expected,
              }),
            ],
          }),
        ];

        this.assertRenderNodes(actual, wrapped, 'root');
      }

      assertRenderNodes(
        actual: CapturedRenderNode[],
        expected: ExpectedRenderNode[],
        path: string
      ): void {
        this.assert.strictEqual(
          actual.length,
          expected.length,
          `Expecting ${expected.length} render nodes at ${path}, got ${actual.length}.\n`
        );

        if (actual.length === expected.length) {
          let byTypeAndName = <T, U, V extends { type: T; name: U }>(a: V, b: V): number => {
            if (a.type > b.type) {
              return 1;
            } else if (a.type < b.type) {
              return -1;
            } else if (a.name > b.name) {
              return 1;
            } else if (a.name < b.name) {
              return -1;
            } else {
              return 0;
            }
          };

          actual = actual.sort(byTypeAndName);
          expected = expected.sort(byTypeAndName);

          for (let i = 0; i < actual.length; i++) {
            this.assertRenderNode(actual[i], expected[i], `${actual[i].type}:${actual[i].name}`);
          }
        } else {
          this.assert.deepEqual(actual, [], path);
        }
      }

      assertRenderNode(
        actual: CapturedRenderNode,
        expected: ExpectedRenderNode,
        path: string
      ): void {
        this.assertProperty(actual.type, expected.type, false, `${path} (type)`);
        this.assertProperty(actual.name, expected.name, false, `${path} (name)`);
        this.assertProperty(actual.args, expected.args, true, `${path} (args)`);
        this.assertProperty(actual.instance, expected.instance, false, `${path} (instance)`);
        this.assertProperty(actual.template, expected.template, false, `${path} (template)`);
        this.assertProperty(actual.bounds, expected.bounds, true, `${path} (bounds)`);

        if (Array.isArray(expected.children)) {
          this.assertRenderNodes(actual.children, expected.children, path);
        } else {
          this.assertProperty(actual.children, expected.children, false, `${path} (children)`);
        }
      }

      assertProperty<T>(actual: T, expected: Expected<T>, deep: boolean, path: string): void {
        if (isExpectedFunc(expected)) {
          this.assert.ok(expected(actual), `Matching ${path}, got ${actual}`);
        } else if (deep) {
          this.assert.deepEqual(actual, expected, `Matching ${path}`);
        } else {
          this.assert.strictEqual(actual, expected, `Matching ${path}`);
        }
      }
    }
  );
}
