import { compile } from 'ember-template-compiler';

const DELIMITER = '%';

function serializeKey(specifier, source, namespace) {
  let [type, name] = specifier.split(':');
  return `${type}://${[
    name,
    namespace ? '[source invalid due to namespace]' : source,
    namespace,
  ].join(DELIMITER)}`;
}

class Resolver {
  constructor() {
    this._registered = {};
  }
  resolve(specifier) {
    return this._registered[specifier] || this._registered[serializeKey(specifier)];
  }
  expandLocalLookup(specifier, source, namespace) {
    if (specifier.indexOf('://') !== -1) {
      return specifier; // an already expanded specifier
    }

    if (source || namespace) {
      let key = serializeKey(specifier, source, namespace);
      if (this._registered[key]) {
        return key; // like local lookup
      }

      key = serializeKey(specifier);
      if (this._registered[key]) {
        return specifier; // top level resolution despite source/namespace
      }
    }

    return specifier; // didn't know how to expand it
  }
  add(lookup, factory) {
    let key;
    switch (typeof lookup) {
      case 'string':
        if (lookup.indexOf(':') === -1) {
          throw new Error('Specifiers added to the resolver must be in the format of type:name');
        }
        key = serializeKey(lookup);
        break;
      case 'object':
        key = serializeKey(lookup.specifier, lookup.source, lookup.namespace);
        break;
      default:
        throw new Error('Specifier string has an unknown type');
    }

    return (this._registered[key] = factory);
  }
  addTemplate(templateName, template) {
    let templateType = typeof template;
    if (templateType !== 'string') {
      throw new Error(
        `You called addTemplate for "${templateName}" with a template argument of type of '${templateType}'. addTemplate expects an argument of an uncompiled template as a string.`
      );
    }
    return (this._registered[serializeKey(`template:${templateName}`)] = compile(template, {
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
