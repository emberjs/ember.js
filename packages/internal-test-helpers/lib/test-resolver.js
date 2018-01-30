import { compile } from 'ember-template-compiler';

const DELIMITER = '\0';

function serializeKey(specifier, referrer, targetNamespace) {
  return [specifier, referrer, targetNamespace].join(DELIMITER);
}

class Resolver {
  constructor() {
    this._registered = {};
    this.constructor.lastInstance = this;
  }
  resolve(specifier, referrer, targetNamespace) {
    return this._registered[serializeKey(specifier, referrer, targetNamespace)];
  }
  add(specifier, factory) {
    let key;
    switch (typeof specifier) {
      case 'string':
        if (specifier.indexOf(':') === -1) {
          throw new Error('Specifiers added to the resolver must be in the format of type:name');
        }
        key = serializeKey(specifier);
        break;
      case 'object':
        key = serializeKey(specifier.specifier, specifier.referrer, specifier.targetNamespace);
        break;
      default:
        throw new Error('Specifier string has an unknown type');
    }

    return this._registered[key] = factory;
  }
  addTemplate(templateName, template) {
    let templateType = typeof template;
    if (templateType !== 'string') {
      throw new Error(`You called addTemplate for "${templateName}" with a template argument of type of '${templateType}'. addTemplate expects an argument of an uncompiled template as a string.`);
    }
    return this._registered[serializeKey(`template:${templateName}`)] = compile(template, {
      moduleName: templateName
    });
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
