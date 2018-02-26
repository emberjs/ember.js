import AbstractApplicationTestCase from './abstract-application';
import { ModuleBasedResolver } from '../test-resolver';
import { assign } from 'ember-utils';

export default class TestResolverApplicationTestCase extends AbstractApplicationTestCase {

  get applicationOptions() {
    return assign(super.applicationOptions, {
      Resolver: ModuleBasedResolver
    });
  }

  add(specifier, factory) {
    this.resolver.add(specifier, factory);
  }

  addTemplate(templateName, templateString) {
    this.resolver.add(`template:${templateName}`, this.compile(templateString, {
      moduleName: templateName
    }));
  }

  addComponent(name, { ComponentClass = null, template = null }) {
    if (ComponentClass) {
      this.resolver.add(`component:${name}`, ComponentClass);
    }

    if (typeof template === 'string') {
      this.resolver.add(`template:components/${name}`, this.compile(template, {
        moduleName: `components/${name}`
      }));
    }
  }

}
