import AbstractApplicationTestCase from './abstract-application';
import type Resolver from '../test-resolver';
import { ModuleBasedResolver } from '../test-resolver';
import Component from '@ember/component';
import type { InternalFactory } from '@ember/-internals/owner';

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
    }: { ComponentClass?: object | null; template?: string | null }
  ) {
    if (ComponentClass) {
      this.resolver!.add(`component:${name}`, ComponentClass);
    }

    if (typeof template === 'string') {
      this.resolver!.add(
        `template:components/${name}`,
        this.compile(template, {
          moduleName: `my-app/templates/components/${name}.hbs`,
        })
      );
    }
  }
}
