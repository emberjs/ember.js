import { compile } from 'ember-template-compiler';

class Resolver {
  constructor() {
    this._registered = {};
  }

  resolve(specifier) {
    return this._registered[specifier] || this._registered[specifier];
  }

  add(lookup, factory) {
    if (lookup.indexOf(':') === -1) {
      throw new Error('Specifiers added to the resolver must be in the format of type:name');
    }

    return (this._registered[lookup] = factory);
  }

  addTemplate(templateName, template) {
    let templateType = typeof template;
    if (templateType !== 'string') {
      throw new Error(
        `You called addTemplate for "${templateName}" with a template argument of type of '${templateType}'. addTemplate expects an argument of an uncompiled template as a string.`
      );
    }
    return (this._registered[`template:${templateName}`] = compile(template, {
      moduleName: `my-app/templates/${templateName}.hbs`,
    }));
  }

  static create() {
    return new this();
  }
}

export default Resolver;

/*
 * A resolver with moduleBasedResolver = true handles error and loading
 * substates differently than a standard resolver.
 */
class ModuleBasedResolver extends Resolver {
  get moduleBasedResolver() {
    return true;
  }
}

export { ModuleBasedResolver };
