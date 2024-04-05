import AbstractApplicationTestCase from './abstract-application';
import type Resolver from '../test-resolver';
import { ModuleBasedResolver } from '../test-resolver';
import Component, { setComponentTemplate } from '@ember/component';
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
      if (ComponentClass === Component) {
        ComponentClass = class extends Component {};
      }

      this.resolver!.add(`component:${name}`, ComponentClass);

      if (typeof template === 'string') {
        setComponentTemplate(this.compile(template, {}), ComponentClass);
      }

      return;
    }

    if (typeof template === 'string') {
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
