import AbstractApplicationTestCase from './abstract-application';
import type Resolver from '../test-resolver';
import { ModuleBasedResolver } from '../test-resolver';
import Component, { setComponentTemplate } from '@ember/component';
import { Component as InternalGlimmerComponent } from '@ember/-internals/glimmer';
import type { InternalFactory } from '@ember/-internals/owner';
import templateOnly from '@ember/component/template-only';

export default abstract class TestResolverApplicationTestCase extends AbstractApplicationTestCase {
  abstract resolver?: Resolver;

  get applicationOptions() {
    return Object.assign(super.applicationOptions, {
      Resolver: ModuleBasedResolver,
    });
  }

  add(specifier: string, factory: InternalFactory<object> | object) {
    this.resolver!.add(specifier, factory);
  }

  addTemplate(templateName: string, templateString: string) {
    this.resolver!.add(
      `template:${templateName}`,
      this.compile(templateString, {
        moduleName: `my-app/templates/${templateName.replace(/\./g, '/')}.hbs`,
      })
    );
  }

  addComponent(
    name: string,
    {
      ComponentClass = Component,
      template = null,
      resolveableTemplate = null,
    }: {
      ComponentClass?: object | null;
      template?: string | null;
      resolveableTemplate?: string | null;
    }
  ) {
    if (ComponentClass) {
      // We cannot set templates multiple times on a class
      //
      // Some of this is almost exclusively for the hot-reload test.
      // But there are a lot of places where it was expected to have multiple templates associated
      // with the same component class (due to the older resolveable templates)
      //
      // We'll want to clean thsi up over time, and probably phase out `addComponent` entirely,
      // and expclusively use `add` w/ `defineComponent`
      if (ComponentClass === Component) {
        ComponentClass = class extends Component {};
      }

      if (ComponentClass === InternalGlimmerComponent) {
        ComponentClass = class extends InternalGlimmerComponent {};
      }

      if ('extend' in ComponentClass) {
        ComponentClass = (ComponentClass as any).extend({});
      }

      if ((ComponentClass as any).moduleName === '@glimmer/component/template-only') {
        ComponentClass = templateOnly();
      }

      this.resolver!.add(`component:${name}`, ComponentClass as Component);

      if (typeof template === 'string') {
        // moduleName not passed to this.compile, because *it's just wrong*.
        // moduleName represents a path-on-disk, and we can't guarantee we have that mapping.
        setComponentTemplate(this.compile(template, {}), ComponentClass as Component);
      }

      return;
    }

    if (typeof template === 'string') {
      // moduleName not passed to this.compile, because *it's just wrong*.
      // moduleName represents a path-on-disk, and we can't guarantee we have that mapping.
      let toComponent = setComponentTemplate(this.compile(template, {}), templateOnly());

      this.resolver!.add(`component:${name}`, toComponent);
    }

    if (typeof resolveableTemplate === 'string') {
      this.resolver!.add(
        `template:components/${name}`,
        this.compile(resolveableTemplate, {
          moduleName: `my-app/templates/components/${name}.hbs`,
        })
      );
    }
  }
}
