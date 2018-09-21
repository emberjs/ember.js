import AbstractApplicationTestCase from './abstract-application';
import { ModuleBasedResolver } from '../test-resolver';
import { Component } from '@ember/-internals/glimmer';
import { assign } from '@ember/polyfills';

export default class TestResolverApplicationTestCase extends AbstractApplicationTestCase {
  get applicationOptions() {
    return assign(super.applicationOptions, {
      Resolver: ModuleBasedResolver,
    });
  }

  add(specifier, factory) {
    this.resolver.add(specifier, factory);
  }

  addTemplate(templateName, templateString) {
    this.resolver.add(
      `template:${templateName}`,
      this.compile(templateString, {
        moduleName: `my-app/templates/${templateName}.hbs`,
      })
    );
  }

  addComponent(name, { ComponentClass = Component, template = null }) {
    if (ComponentClass) {
      this.resolver.add(`component:${name}`, ComponentClass);
    }

    if (typeof template === 'string') {
      this.resolver.add(
        `template:components/${name}`,
        this.compile(template, {
          moduleName: `my-app/templates/components/${name}.hbs`,
        })
      );
    }
  }
}
