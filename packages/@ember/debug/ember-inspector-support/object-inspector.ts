import DebugPort from './debug-port';
import bound from '@ember/debug/ember-inspector-support/utils/bound-method';
import { typeOf, inspect } from '@ember/debug/ember-inspector-support/utils/type-check';
import { cacheFor } from '@ember/object/internals';
import { _backburner, join } from '@ember/runloop';
import EmberObject from '@ember/object';
import Service from '@ember/service';
import CoreObject from '@ember/object/core';
import { meta as emberMeta } from '@ember/-internals/meta';
import emberNames from './utils/ember-object-names';
import getObjectName from './utils/get-object-name';
import type { Tag } from '@glimmer/validator';
import {
  valueForTag as tagValue,
  validateTag as tagValidate,
  track,
  tagFor,
} from '@glimmer/validator';
import { isComputed, tagForProperty } from '@ember/-internals/metal';
import { guidFor } from './utils/ember/object/internals';
import type Mixin from '@ember/object/mixin';
import ObjectProxy from '@ember/object/proxy';
import ArrayProxy from '@ember/array/proxy';
import Component from '@ember/component';

const keys = Object.keys;

/**
 * Determine the type and get the value of the passed property
 * @param {*} object The parent object we will look for `key` on
 * @param {string} key The key for the property which points to a computed, EmberObject, etc
 * @param {*} computedValue A value that has already been computed with calculateCP
 * @return {{inspect: (string|*), type: string}|{computed: boolean, inspect: string, type: string}|{inspect: string, type: string}}
 */
function inspectValue(
  object: any,
  key: string,
  computedValue?: any
): { type: string; inspect: string; isCalculated?: boolean } {
  let string;
  const value = computedValue;

  if (arguments.length === 3 && computedValue === undefined) {
    return { type: `type-undefined`, inspect: 'undefined' };
  }

  // TODO: this is not very clean. We should refactor calculateCP, etc, rather than passing computedValue
  if (computedValue !== undefined) {
    if (value instanceof HTMLElement) {
      return {
        type: 'type-object',
        inspect: `<${value.tagName.toLowerCase()}>`,
      };
    }
    return { type: `type-${typeOf(value)}`, inspect: inspect(value) };
  }

  if (value instanceof EmberObject) {
    return { type: 'type-ember-object', inspect: value.toString() };
  } else if (isComputed(object, key)) {
    string = '<computed>';
    return { type: 'type-descriptor', inspect: string };
  } else if (value?.isDescriptor) {
    return { type: 'type-descriptor', inspect: value.toString() };
  } else if (value instanceof HTMLElement) {
    return { type: 'type-object', inspect: value.tagName.toLowerCase() };
  } else {
    return { type: `type-${typeOf(value)}`, inspect: inspect(value) };
  }
}

function isMandatorySetter(descriptor: PropertyDescriptor) {
  if (
    descriptor.set &&
    Function.prototype.toString.call(descriptor.set).includes('You attempted to update')
  ) {
    return true;
  }
  return false;
}

function getTagTrackedTags(tag: Tag, ownTag: Tag, level = 0) {
  const props: Tag[] = [];
  // do not include tracked properties from dependencies
  if (!tag || level > 1) {
    return props;
  }
  const subtags = Array.isArray(tag.subtag) ? tag.subtag : [];
  if (tag.subtag && !Array.isArray(tag.subtag)) {
    // if (tag.subtag._propertyKey) props.push(tag.subtag);
    // TODO fetch tag metadata object and property key
    props.push(...getTagTrackedTags(tag.subtag, ownTag, level + 1));
  }
  if (subtags) {
    subtags.forEach((t) => {
      if (t === ownTag) return;
      // if (t._propertyKey) props.push(t);
      // TODO fetch tag metadata object and property key
      props.push(...getTagTrackedTags(t, ownTag, level + 1));
    });
  }
  return props;
}

// TODO needs https://github.com/glimmerjs/glimmer-vm/pull/1489
function getTrackedDependencies(
  object: any,
  property: string,
  tagInfo: { tag: Tag; revision: number }
) {
  const tag = tagInfo.tag;
  const proto = Object.getPrototypeOf(object);
  if (!proto) return [];
  const cpDesc = emberMeta(object).peekDescriptors(property);
  const dependentKeys = [];
  if (cpDesc) {
    dependentKeys.push(...(cpDesc._dependentKeys || []).map((k: string) => ({ name: k })));
  }
  const ownTag = tagFor(object, property);
  const tags = getTagTrackedTags(tag, ownTag);
  const mapping: Record<string, [string, any][]> = {};
  let maxRevision = tagValue(tag);
  tags.forEach(() => {
    // TODO needs https://github.com/glimmerjs/glimmer-vm/pull/1489
    // const p = (t._object ? getObjectName(t._object) + '.' : '') + t._propertyKey;
    // const [objName, prop] = p.split('.');
    // mapping[objName] = mapping[objName] || new Set();
    // const value = tagValue(t);
    // if (prop) {
    //   mapping[objName].add([prop, value]);
    // }
  });
  const hasChange = (tagInfo.revision && maxRevision !== tagInfo.revision) || false;
  const names = new Set();
  Object.entries(mapping).forEach(([objName, props]) => {
    if (names.has(objName)) {
      return;
    }
    names.add(objName);
    if (props.length > 1) {
      dependentKeys.push({ name: objName });
      props.forEach((p) => {
        const changed = hasChange && p[1] > tagInfo.revision;
        const obj = {
          child: p[0],
          changed: false,
        };
        if (changed) {
          obj.changed = true;
        }
        dependentKeys.push(obj);
      });
    }
    if (props.length === 1) {
      const p = [...props][0]!;
      const changed = hasChange && p[1] > tagInfo.revision;
      const obj = {
        name: objName + '.' + p[0],
        changed: false,
      };
      if (changed) {
        obj.changed = true;
      }
      dependentKeys.push(obj);
    }
    if (props.length === 0) {
      dependentKeys.push({ name: objName });
    }
  });

  return [...dependentKeys];
}

type DebugPropertyInfo = {
  skipMixins: string[];
  skipProperties: string[];
  groups: {
    name: string;
    expand: boolean;
    properties: string[];
  }[];
};

type PropertyInfo = {
  code: any;
  isService: any;
  dependentKeys: any;
  isGetter: any;
  isTracked: any;
  isProperty: any;
  isComputed: any;
  auto: any;
  readOnly: any;
  isMandatorySetter: any;
  canTrack: boolean;
  name: any;
  value: any;
  isExpensive: boolean;
  overridden: boolean;
};

type MixinDetails = {
  id: string;
  name: string;
  properties: PropertyInfo[];
  expand?: boolean;
  isEmberMixin?: boolean;
};

type TagInfo = {
  revision: number;
  tag: Tag;
};

export default class ObjectInspector extends DebugPort {
  get adapter() {
    return this.namespace?.adapter;
  }

  currentObject: {
    object: any;
    mixinDetails: MixinDetails[];
    objectId: string;
  } | null = null;

  updateCurrentObject() {
    Object.values(this.sentObjects).forEach((obj) => {
      if (obj instanceof CoreObject && obj.isDestroyed) {
        this.dropObject(guidFor(obj));
      }
    });
    if (this.currentObject) {
      const { object, mixinDetails, objectId } = this.currentObject;
      mixinDetails.forEach((mixin, mixinIndex) => {
        mixin.properties.forEach((item) => {
          if (item.overridden) {
            return true;
          }
          try {
            let cache = cacheFor(object, item.name);
            if (item.isExpensive && !cache) return true;
            if (item.value.type === 'type-function') return true;

            let value = null;
            let changed = false;
            const values = (this.objectPropertyValues[objectId] =
              this.objectPropertyValues[objectId] || {});
            const tracked = (this.trackedTags[objectId] = this.trackedTags[objectId] || {});

            const desc = Object.getOwnPropertyDescriptor(object, item.name);
            const isSetter = desc && isMandatorySetter(desc);

            if (item.canTrack && !isSetter) {
              let tagInfo = tracked[item.name] || {
                tag: tagFor(object, item.name),
                revision: 0,
              };
              if (!tagInfo.tag) return false;

              changed = !tagValidate(tagInfo.tag, tagInfo.revision);
              if (changed) {
                tagInfo.tag = track(() => {
                  value = object.get?.(item.name) || object[item.name];
                });
              }
              tracked[item.name] = tagInfo;
            } else {
              value = calculateCP(object, item, {});
              if (values[item.name] !== value) {
                changed = true;
                values[item.name] = value;
              }
            }

            if (changed) {
              value = inspectValue(object, item.name, value) as any;
              value.isCalculated = true;
              let dependentKeys = null;
              if (tracked[item.name]) {
                dependentKeys = getTrackedDependencies(object, item.name, tracked[item.name]);
                tracked[item.name].revision = tagValue(tracked[item.name].tag);
              }
              this.sendMessage('updateProperty', {
                objectId,
                property:
                  Array.isArray(object) && !Number.isNaN(parseInt(item.name))
                    ? parseInt(item.name)
                    : item.name,
                value,
                mixinIndex,
                dependentKeys,
              });
            }
          } catch {
            // dont do anything
          }
          return false;
        });
      });
    }
  }

  init() {
    super.init();
    this.sentObjects = {};
    _backburner.on('end', bound(this, this.updateCurrentObject));
  }

  willDestroy() {
    super.willDestroy();
    for (let objectId in this.sentObjects) {
      this.releaseObject(objectId);
    }
    _backburner.off('end', bound(this, this.updateCurrentObject));
  }

  sentObjects: Record<string, any> = {};

  parentObjects: Record<string, any> = {};

  objectPropertyValues: Record<string, Record<string, any>> = {};

  trackedTags: Record<string, Record<string, any>> = {};

  _errorsFor: Record<string, Record<string, { property: string; error: any }>> = {};

  static {
    this.prototype.portNamespace = 'objectInspector';
    this.prototype.messages = {
      digDeeper(this: ObjectInspector, message: { objectId: any; property: any }) {
        this.digIntoObject(message.objectId, message.property);
      },
      releaseObject(this: ObjectInspector, message: { objectId: any }) {
        this.releaseObject(message.objectId);
      },
      calculate(
        this: ObjectInspector,
        message: {
          objectId: string;
          property: string;
          mixinIndex: number;
          isCalculated: boolean;
        }
      ) {
        let value;
        value = this.valueForObjectProperty(message.objectId, message.property, message.mixinIndex);
        if (value) {
          this.sendMessage('updateProperty', value);
          message.isCalculated = true;
        }
        this.sendMessage('updateErrors', {
          objectId: message.objectId,
          errors: errorsToSend(this._errorsFor[message.objectId]!),
        });
      },
      saveProperty(
        this: ObjectInspector,
        message: { value: any; dataType: string; objectId: string; property: string }
      ) {
        let value = message.value;
        if (message.dataType && message.dataType === 'date') {
          value = new Date(value);
        }
        this.saveProperty(message.objectId, message.property, value);
      },
      sendToConsole(this: ObjectInspector, message: { objectId: any; property: string }) {
        this.sendToConsole(message.objectId, message.property);
      },
      gotoSource(this: ObjectInspector, message: { objectId: any; property: string }) {
        this.gotoSource(message.objectId, message.property);
      },
      sendControllerToConsole(this: ObjectInspector, message: { name: string }) {
        const container = this.namespace?.owner;
        this.sendValueToConsole(container.lookup(`controller:${message.name}`));
      },
      sendRouteHandlerToConsole(this: ObjectInspector, message: { name: string }) {
        const container = this.namespace?.owner;
        this.sendValueToConsole(container.lookup(`route:${message.name}`));
      },
      sendContainerToConsole(this: ObjectInspector) {
        const container = this.namespace?.owner;
        this.sendValueToConsole(container);
      },
      /**
       * Lookup the router instance, and find the route with the given name
       * @param message The message sent
       * @param {string} messsage.name The name of the route to lookup
       */
      inspectRoute(this: ObjectInspector, message: { name: string }) {
        const container = this.namespace?.owner;
        const router = container.lookup('router:main');
        const routerLib = router._routerMicrolib || router.router;
        // 3.9.0 removed intimate APIs from router
        // https://github.com/emberjs/ember.js/pull/17843
        // https://deprecations.emberjs.com/v3.x/#toc_remove-handler-infos
        // Ember >= 3.9.0
        this.sendObject(routerLib.getRoute(message.name));
      },
      inspectController(this: ObjectInspector, message: { name: string }) {
        const container = this.namespace?.owner;
        this.sendObject(container.lookup(`controller:${message.name}`));
      },
      inspectById(this: ObjectInspector, message: { objectId: string }) {
        const obj = this.sentObjects[message.objectId]!;
        if (obj) {
          this.sendObject(obj);
        }
      },
      inspectByContainerLookup(this: ObjectInspector, message: { name: string }) {
        const container = this.namespace?.owner;
        this.sendObject(container.lookup(message.name));
      },
      traceErrors(this: ObjectInspector, message: { objectId: string }) {
        let errors = this._errorsFor[message.objectId]!;
        toArray(errors).forEach((error) => {
          let stack = error.error;
          if (stack && stack.stack) {
            stack = stack.stack;
          } else {
            stack = error;
          }
          this.adapter.log(`Object Inspector error for ${error.property}`, stack);
        });
      },
    };
  }

  canSend(val: any) {
    return (
      val &&
      (val instanceof EmberObject ||
        val instanceof Object ||
        typeOf(val) === 'object' ||
        typeOf(val) === 'array')
    );
  }

  saveProperty(objectId: string, prop: string, val: any) {
    let object = this.sentObjects[objectId];
    join(() => {
      if (object.set) {
        object.set(prop, val);
      } else {
        object[prop] = val;
      }
    });
  }

  gotoSource(objectId: string, prop: string) {
    let object = this.sentObjects[objectId];
    let value;

    if (prop === null || prop === undefined) {
      value = this.sentObjects[objectId];
    } else {
      value = calculateCP(object, { name: prop } as PropertyInfo, {});
    }
    // for functions and classes we want to show the source
    if (typeof value === 'function') {
      this.adapter.inspectValue(value);
    }
    // use typeOf to distinguish basic objects/classes and Date, Error etc.
    // objects like {...} have the constructor set to Object
    if (typeOf(value) === 'object' && value.constructor !== Object) {
      this.adapter.inspectValue(value.constructor);
    }
  }

  sendToConsole(objectId: string, prop?: string) {
    let object = this.sentObjects[objectId];
    let value;

    if (prop === null || prop === undefined) {
      value = this.sentObjects[objectId];
    } else {
      value = calculateCP(object, { name: prop } as PropertyInfo, {});
    }

    this.sendValueToConsole(value);
  }

  sendValueToConsole(value: any) {
    (window as any).$E = value;
    if (value instanceof Error) {
      value = value.stack;
    }
    let args = [value];
    if (value instanceof EmberObject) {
      args.unshift(inspect(value));
    }
    this.adapter.log('Ember Inspector ($E): ', ...args);
  }

  digIntoObject(objectId: string, property: string) {
    let parentObject = this.sentObjects[objectId];
    let object = calculateCP(parentObject, { name: property } as PropertyInfo, {});

    if (this.canSend(object)) {
      const currentObject = this.currentObject;
      let details = this.mixinsForObject(object);
      this.parentObjects[details.objectId] = currentObject;
      this.sendMessage('updateObject', {
        parentObject: objectId,
        property,
        objectId: details.objectId,
        name: getObjectName(object),
        details: details.mixins,
        errors: details.errors,
      });
    }
  }

  sendObject(object: any) {
    if (!this.canSend(object)) {
      throw new Error(`Can't inspect ${object}. Only Ember objects and arrays are supported.`);
    }
    let details = this.mixinsForObject(object);
    this.sendMessage('updateObject', {
      objectId: details.objectId,
      name: getObjectName(object),
      details: details.mixins,
      errors: details.errors,
    });
  }

  retainObject(object: any) {
    let meta = emberMeta(object) as any;
    let guid = guidFor(object);

    meta._debugReferences = meta._debugReferences || 0;
    meta._debugReferences++;

    this.sentObjects[guid] = object;

    return guid;
  }

  releaseObject(objectId: string) {
    let object = this.sentObjects[objectId];
    if (!object) {
      return;
    }
    let meta = emberMeta(object) as any;
    let guid = guidFor(object);

    meta._debugReferences--;

    if (meta._debugReferences === 0) {
      this.dropObject(guid);
    }
  }

  dropObject(objectId: string) {
    if (this.parentObjects[objectId]) {
      this.currentObject = this.parentObjects[objectId];
    }
    delete this.parentObjects[objectId];

    delete this.sentObjects[objectId];
    delete this.objectPropertyValues[objectId];
    delete this.trackedTags[objectId];
    if (this.currentObject && this.currentObject.objectId === objectId) {
      this.currentObject = null;
    }

    delete this._errorsFor[objectId];

    this.sendMessage('droppedObject', { objectId });
  }

  /**
   * This function, and the rest of Ember Inspector, currently refer to the
   * output entirely as mixins. However, this is no longer accurate! This has
   * been refactored to return a list of objects that represent both the classes
   * themselves and their mixins. For instance, the following class definitions:
   *
   * ```js
   * class Foo extends EmberObject {}
   *
   * class Bar extends Foo {}
   *
   * class Baz extends Bar.extend(Mixin1, Mixin2) {}
   *
   * let obj = Baz.create();
   * ```
   *
   * Will result in this in the inspector:
   *
   * ```
   * - Own Properties
   * - Baz
   * - Mixin1
   * - Mixin2
   * - Bar
   * - Foo
   * - EmberObject
   * ```
   *
   * The "mixins" returned by this function directly represent these things too.
   * Each class object consists of the actual own properties of that class's
   * prototype, and is followed by the mixins (if any) that belong to that
   * class. Own Properties represents the actual own properties of the object
   * itself.
   *
   * TODO: The rest of the Inspector should be updated to reflect this new data
   * model, and these functions should be updated with new names. Mixins should
   * likely be embedded _on_ the class definitions, but this was designed to be
   * backwards compatible.
   */
  mixinDetailsForObject(object: any): MixinDetails[] {
    const mixins = [];

    const own = ownMixins(object);

    const objectMixin = {
      id: guidFor(object),
      name: getObjectName(object),
      properties: ownProperties(object, own),
    } as MixinDetails;

    mixins.push(objectMixin);

    // insert ember mixins
    for (let mixin of own) {
      let name = (mixin.ownerConstructor || emberNames.get(mixin) || '').toString();

      if (!name && typeof mixin.toString === 'function') {
        try {
          name = mixin.toString();

          if (name === '(unknown)') {
            name = '(unknown mixin)';
          }
        } catch {
          name = '(Unable to convert Object to string)';
        }
      }

      const mix = {
        properties: propertiesForMixin(mixin),
        name,
        isEmberMixin: true,
        id: guidFor(mixin),
      };

      mixins.push(mix);
    }

    const proto = Object.getPrototypeOf(object);

    if (proto && proto !== Object.prototype) {
      mixins.push(...this.mixinDetailsForObject(proto));
    }

    return mixins;
  }

  mixinsForObject(object: any) {
    if (object instanceof ObjectProxy && object.content && !(object as any)._showProxyDetails) {
      object = object.content;
    }

    if (object instanceof ArrayProxy && object.content && !(object as any)._showProxyDetails) {
      object = object.slice(0, 101);
    }

    let mixinDetails = this.mixinDetailsForObject(object);

    mixinDetails[0]!.name = 'Own Properties';
    mixinDetails[0]!.expand = true;

    if (mixinDetails[1] && !mixinDetails[1].isEmberMixin) {
      mixinDetails[1].expand = true;
    }

    fixMandatorySetters(mixinDetails);
    applyMixinOverrides(mixinDetails);

    let debugPropertyInfo = null;
    let debugInfo = getDebugInfo(object);
    if (debugInfo) {
      debugPropertyInfo = getDebugInfo(object).propertyInfo;
      mixinDetails = customizeProperties(mixinDetails, debugPropertyInfo);
    }

    let expensiveProperties = null;
    if (debugPropertyInfo) {
      expensiveProperties = debugPropertyInfo.expensiveProperties;
    }

    let objectId = this.retainObject(object);

    let errorsForObject = (this._errorsFor[objectId] = {});
    const tracked = (this.trackedTags[objectId] = this.trackedTags[objectId] || {});
    calculateCPs(object, mixinDetails, errorsForObject, expensiveProperties, tracked);

    this.currentObject = { object, mixinDetails, objectId };

    let errors = errorsToSend(errorsForObject);
    return { objectId, mixins: mixinDetails, errors };
  }

  valueForObjectProperty(objectId: string, property: string, mixinIndex: number) {
    let object = this.sentObjects[objectId],
      value;

    if (object.isDestroying) {
      value = '<DESTROYED>';
    } else {
      value = calculateCP(object, { name: property } as PropertyInfo, this._errorsFor[objectId]!);
    }

    if (!value || !(value instanceof CalculateCPError)) {
      value = inspectValue(object, property, value);
      value.isCalculated = true;

      return { objectId, property, value, mixinIndex };
    }

    return null;
  }

  inspect = inspect;
  inspectValue = inspectValue;
}

function ownMixins(object: any) {
  // TODO: We need to expose an API for getting _just_ the own mixins directly
  let meta = emberMeta(object);
  let parentMeta = meta.parent;
  let mixins = new Set<Mixin>();

  // Filter out anonymous mixins that are directly in a `class.extend`
  let baseMixins =
    object.constructor &&
    object.constructor.PrototypeMixin &&
    object.constructor.PrototypeMixin.mixins;

  meta.forEachMixins((m: Mixin) => {
    // Find mixins that:
    // - Are not in the parent classes
    // - Are not primitive (has mixins, doesn't have properties)
    // - Don't include any of the base mixins from a class extend
    if (
      (!parentMeta || !parentMeta.hasMixin(m)) &&
      !m.properties &&
      m.mixins &&
      (!baseMixins || !m.mixins.some((m) => baseMixins.includes(m)))
    ) {
      mixins.add(m);
    }
  });

  return mixins;
}

function ownProperties(object: any, ownMixins: Set<Mixin>) {
  let meta = emberMeta(object);

  if (Array.isArray(object)) {
    // slice to max 101, for performance and so that the object inspector will show a `more items` indicator above 100
    object = object.slice(0, 101);
  }

  let props = Object.getOwnPropertyDescriptors(object) as any;
  delete props.constructor;

  // meta has the correct descriptors for CPs
  meta.forEachDescriptors((name, desc) => {
    // only for own properties
    if (props[name]) {
      props[name] = desc;
    }
  });

  // remove properties set by mixins
  // especially for Object.extend(mixin1, mixin2), where a new class is created which holds the merged properties
  // if all properties are removed, it will be marked as useless mixin and will not be shown
  ownMixins.forEach((m) => {
    if (m.mixins) {
      m.mixins.forEach((mix) => {
        Object.keys(mix.properties || {}).forEach((k) => {
          const pDesc = Object.getOwnPropertyDescriptor(mix.properties, k) as PropertyDescriptor & {
            _getter: () => any;
          };
          if (pDesc && props[k] && pDesc.get && pDesc.get === props[k].get) {
            delete props[k];
          }
          if (pDesc && props[k] && 'value' in pDesc && pDesc.value === props[k].value) {
            delete props[k];
          }
          if (pDesc && props[k] && pDesc._getter === props[k]._getter) {
            delete props[k];
          }
        });
      });
    }
  });

  Object.keys(props).forEach((k) => {
    if (typeof props[k].value === 'function') {
      return;
    }
    props[k].isDescriptor = true;
  });

  // Clean the properties, removing private props and bindings, etc
  return addProperties([], props);
}

function propertiesForMixin(mixin: Mixin) {
  let properties: PropertyInfo[] = [];

  if (mixin.mixins) {
    mixin.mixins.forEach((mixin) => {
      if (mixin.properties) {
        addProperties(properties, mixin.properties);
      }
    });
  }

  return properties;
}

function addProperties(properties: unknown[], hash: any) {
  for (let prop in hash) {
    if (!Object.prototype.hasOwnProperty.call(hash, prop)) {
      continue;
    }

    if (isInternalProperty(prop)) {
      continue;
    }

    // remove `fooBinding` type props
    if (prop.match(/Binding$/)) {
      continue;
    }

    // when mandatory setter is removed, an `undefined` value may be set
    const desc = Object.getOwnPropertyDescriptor(hash, prop) as any;
    if (!desc) continue;
    if (hash[prop] === undefined && desc.value === undefined && !desc.get && !desc._getter) {
      continue;
    }

    let options = {
      isMandatorySetter: isMandatorySetter(desc),
      isService: false,
      isComputed: false,
      code: undefined as string | undefined,
      dependentKeys: undefined,
      isCalculated: undefined as boolean | undefined,
      readOnly: undefined as boolean | undefined,
      auto: undefined as boolean | undefined,
      canTrack: undefined as boolean | undefined,
      isGetter: undefined as boolean | undefined,
      isTracked: undefined as boolean | undefined,
      isProperty: undefined as boolean | undefined,
    };

    if (typeof hash[prop] === 'object' && hash[prop] !== null) {
      options.isService = !('type' in hash[prop]) && hash[prop].type === 'service';

      if (!options.isService) {
        if (hash[prop].constructor) {
          options.isService = hash[prop].constructor.isServiceFactory;
        }
      }

      if (!options.isService) {
        options.isService = desc.value instanceof Service;
      }
    }
    if (options.isService) {
      replaceProperty(properties, prop, inspectValue(hash, prop), options);
      continue;
    }

    if (isComputed(hash, prop)) {
      options.isComputed = true;
      options.dependentKeys = (desc._dependentKeys || []).map((key: string) => key.toString());

      if (typeof desc.get === 'function') {
        options.code = Function.prototype.toString.call(desc.get);
      }
      if (typeof desc._getter === 'function') {
        options.isCalculated = true;
        options.code = Function.prototype.toString.call(desc._getter);
      }
      if (!options.code) {
        options.code = '';
      }

      options.readOnly = desc._readOnly;
      options.auto = desc._auto;
      options.canTrack = options.code !== '';
    }

    if (desc.get) {
      options.isGetter = true;
      options.canTrack = true;
      if (!desc.set) {
        options.readOnly = true;
      }
    }
    if (Object.prototype.hasOwnProperty.call(desc, 'value') || options.isMandatorySetter) {
      delete options.isGetter;
      delete options.isTracked;
      options.isProperty = true;
      options.canTrack = false;
    }
    replaceProperty(properties, prop, inspectValue(hash, prop), options);
  }

  return properties;
}

function isInternalProperty(property: string) {
  if (
    [
      '_state',
      '_states',
      '_target',
      '_currentState',
      '_super',
      '_debugContainerKey',
      '_transitionTo',
      '_debugInfo',
      '_showProxyDetails',
    ].includes(property)
  ) {
    return true;
  }

  let isInternalProp = [
    '__LEGACY_OWNER',
    '__ARGS__',
    '__HAS_BLOCK__',
    '__PROPERTY_DID_CHANGE__',
  ].some((internalProp) => property.startsWith(internalProp));

  return isInternalProp;
}

function replaceProperty(properties: any, name: string, value: any, options: any) {
  let found;

  let i, l;
  for (i = 0, l = properties.length; i < l; i++) {
    if (properties[i].name === name) {
      found = i;
      break;
    }
  }

  if (found) {
    properties.splice(i, 1);
  }

  let prop = { name, value } as PropertyInfo;
  prop.isMandatorySetter = options.isMandatorySetter;
  prop.readOnly = options.readOnly;
  prop.auto = options.auto;
  prop.canTrack = options.canTrack;
  prop.isComputed = options.isComputed;
  prop.isProperty = options.isProperty;
  prop.isTracked = options.isTracked;
  prop.isGetter = options.isGetter;
  prop.dependentKeys = options.dependentKeys || [];
  let hasServiceFootprint =
    prop.value && typeof prop.value.inspect === 'string'
      ? prop.value.inspect.includes('@service:')
      : false;
  prop.isService = options.isService || hasServiceFootprint;
  prop.code = options.code;
  properties.push(prop);
}

function fixMandatorySetters(mixinDetails: MixinDetails[]) {
  let seen: any = {};
  let propertiesToRemove: any = [];

  mixinDetails.forEach((detail, detailIdx) => {
    detail.properties.forEach((property) => {
      if (property.isMandatorySetter) {
        seen[property.name] = {
          name: property.name,
          value: property.value.inspect,
          detailIdx,
          property,
        };
      } else if (Object.prototype.hasOwnProperty.call(seen, property.name) && seen[property.name]) {
        propertiesToRemove.push(seen[property.name]);
        delete seen[property.name];
      }
    });
  });

  propertiesToRemove.forEach((prop: any) => {
    let detail = mixinDetails[prop.detailIdx]!;
    let index = detail.properties.indexOf(prop.property);
    if (index !== -1) {
      detail.properties.splice(index, 1);
    }
  });
}

function applyMixinOverrides(mixinDetails: MixinDetails[]) {
  let seen: any = {};
  mixinDetails.forEach((detail) => {
    detail.properties.forEach((property) => {
      if (Object.prototype.hasOwnProperty.call(Object.prototype, property.name)) {
        return;
      }

      if (seen[property.name]) {
        property.overridden = seen[property.name];
        delete property.value.isCalculated;
      }

      seen[property.name] = detail.name;
    });
  });
}

function calculateCPs(
  object: any,
  mixinDetails: MixinDetails[],
  errorsForObject: Record<string, { property: string; error: any }>,
  expensiveProperties: string[],
  tracked: Record<string, TagInfo>
) {
  expensiveProperties = expensiveProperties || [];
  mixinDetails.forEach((mixin) => {
    mixin.properties.forEach((item) => {
      if (item.overridden) {
        return true;
      }
      if (!item.value.isCalculated) {
        let cache = cacheFor(object, item.name);
        item.isExpensive = expensiveProperties.indexOf(item.name) >= 0;
        if (cache !== undefined || !item.isExpensive) {
          let value;
          if (item.canTrack) {
            tracked[item.name] = tracked[item.name] || ({} as TagInfo);
            const tagInfo = tracked[item.name]!;
            tagInfo.tag = track(() => {
              value = calculateCP(object, item, errorsForObject);
            });
            if (tagInfo.tag === tagForProperty(object, item.name)) {
              if (!item.isComputed && !item.isService) {
                item.code = '';
                item.isTracked = true;
              }
            }
            item.dependentKeys = getTrackedDependencies(object, item.name, tagInfo);
            tagInfo.revision = tagValue(tagInfo.tag);
          } else {
            value = calculateCP(object, item, errorsForObject);
          }
          if (!value || !(value instanceof CalculateCPError)) {
            item.value = inspectValue(object, item.name, value);
            item.value.isCalculated = true;
            if (item.value.type === 'type-function') {
              item.code = '';
            }
          }
        }
      }
      return;
    });
  });
}

/**
 Customizes an object's properties
 based on the property `propertyInfo` of
 the object's `_debugInfo` method.

 Possible options:
 - `groups` An array of groups that contains the properties for each group
 For example:
 ```javascript
 groups: [
 { name: 'Attributes', properties: ['firstName', 'lastName'] },
 { name: 'Belongs To', properties: ['country'] }
 ]
 ```
 - `includeOtherProperties` Boolean,
 - `true` to include other non-listed properties,
 - `false` to only include given properties
 - `skipProperties` Array containing list of properties *not* to include
 - `skipMixins` Array containing list of mixins *not* to include
 - `expensiveProperties` An array of computed properties that are too expensive.
 Adding a property to this array makes sure the CP is not calculated automatically.

 Example:
 ```javascript
 {
   propertyInfo: {
     includeOtherProperties: true,
     skipProperties: ['toString', 'send', 'withTransaction'],
     skipMixins: [ 'Ember.Evented'],
     calculate: ['firstName', 'lastName'],
     groups: [
       {
         name: 'Attributes',
         properties: [ 'id', 'firstName', 'lastName' ],
         expand: true // open by default
       },
       {
         name: 'Belongs To',
         properties: [ 'maritalStatus', 'avatar' ],
         expand: true
       },
       {
         name: 'Has Many',
         properties: [ 'phoneNumbers' ],
         expand: true
       },
       {
         name: 'Flags',
         properties: ['isLoaded', 'isLoading', 'isNew', 'isDirty']
       }
     ]
   }
 }
 ```
 */
function customizeProperties(mixinDetails: MixinDetails[], propertyInfo: DebugPropertyInfo) {
  let newMixinDetails: MixinDetails[] = [];
  let neededProperties: Record<string, boolean | PropertyInfo> = {};
  let groups = propertyInfo.groups || [];
  let skipProperties = propertyInfo.skipProperties || [];
  let skipMixins = propertyInfo.skipMixins || [];

  if (groups.length) {
    mixinDetails[0]!.expand = false;
  }

  groups.forEach((group) => {
    group.properties.forEach((prop) => {
      neededProperties[prop] = true;
    });
  });

  mixinDetails.forEach((mixin) => {
    let newProperties: PropertyInfo[] = [];
    mixin.properties.forEach((item) => {
      if (skipProperties.indexOf(item.name) !== -1) {
        return true;
      }

      if (
        !item.overridden &&
        Object.prototype.hasOwnProperty.call(neededProperties, item.name) &&
        neededProperties[item.name]
      ) {
        neededProperties[item.name] = item;
      } else {
        newProperties.push(item);
      }
      return;
    });
    mixin.properties = newProperties;
    if (mixin.properties.length === 0 && mixin.name.toLowerCase().includes('unknown')) {
      // nothing useful for this mixin
      return;
    }
    if (skipMixins.indexOf(mixin.name) === -1) {
      newMixinDetails.push(mixin);
    }
  });

  groups
    .slice()
    .reverse()
    .forEach((group) => {
      let newMixin = {
        name: group.name,
        expand: group.expand,
        properties: [] as PropertyInfo[],
      } as MixinDetails;
      group.properties.forEach(function (prop) {
        // make sure it's not `true` which means property wasn't found
        if (neededProperties[prop] !== true) {
          newMixin.properties.push(neededProperties[prop] as PropertyInfo);
        }
      });
      newMixinDetails.unshift(newMixin);
    });

  return newMixinDetails;
}

function getDebugInfo(object: any) {
  let debugInfo = null;
  let objectDebugInfo = object._debugInfo;
  if (objectDebugInfo && typeof objectDebugInfo === 'function') {
    if (object instanceof ObjectProxy && object.content) {
      object = object.content;
    }
    debugInfo = objectDebugInfo.call(object);
  }
  debugInfo = debugInfo || {};
  let propertyInfo = debugInfo.propertyInfo || (debugInfo.propertyInfo = {});
  let skipProperties = (propertyInfo.skipProperties =
    propertyInfo.skipProperties || (propertyInfo.skipProperties = []));

  skipProperties.push('isDestroyed', 'isDestroying', 'container');
  // 'currentState' and 'state' are un-observable private properties.
  // The rest are skipped to reduce noise in the inspector.
  if (Component && object instanceof Component) {
    skipProperties.push(
      'currentState',
      'state',
      'buffer',
      'outletSource',
      'lengthBeforeRender',
      'lengthAfterRender',
      'template',
      'layout',
      'templateData',
      'domManager',
      'states',
      'element',
      'targetObject'
    );
  } else if (object?.constructor?.name === 'GlimmerDebugComponent') {
    // These properties don't really exist on Glimmer Components, but
    // reading their values trigger a development mode assertion. The
    // more correct long term fix is to make getters lazy (shows "..."
    // in the UI and only computed them when requested (when the user
    // clicked on the "..." in the UI).
    skipProperties.push('bounds', 'debugName', 'element');
  }
  return debugInfo;
}

function toArray(errors: Record<string, any>) {
  return keys(errors).map((key) => errors[key]);
}

function calculateCP(object: any, item: PropertyInfo, errorsForObject: Record<string, any>) {
  const property = item.name;
  delete errorsForObject[property];
  try {
    if (object instanceof ArrayProxy && property == parseInt(property)) {
      return object.objectAt(property);
    }
    return item.isGetter || property.includes?.('.')
      ? object[property]
      : object.get?.(property) || object[property]; // need to use `get` to be able to detect tracked props
  } catch (error) {
    errorsForObject[property] = { property, error };
    return new CalculateCPError();
  }
}

class CalculateCPError {}

function errorsToSend(errors: Record<string, { property: string; error: any }>) {
  return toArray(errors).map((error) => ({ property: error.property }));
}
