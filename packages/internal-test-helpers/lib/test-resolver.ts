import { compile } from 'ember-template-compiler';

const DELIMITER = '%';

function serializeKey(specifier: string, source?: unknown, namespace?: unknown) {
  let [type, name] = specifier.split(':');
  return `${type}://${[
    name,
    namespace ? '[source invalid due to namespace]' : source,
    namespace,
  ].join(DELIMITER)}`;
}

class Resolver {
  _registered: Record<string, unknown>;

  constructor() {
    this._registered = {};
  }
  resolve(specifier: string) {
    return this._registered[specifier] || this._registered[serializeKey(specifier)];
  }
  add(
    lookup: string | { specifier: string; source: unknown; namespace: unknown },
    factory: unknown
  ) {
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
  addTemplate(templateName: string, template: string) {
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
