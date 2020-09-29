import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { _WeakSet as WeakSet } from '@glimmer/util';
import { Tag } from '@glimmer/validator';
import lookupDescriptor from './lookup-descriptor';

export let setupMandatorySetter:
  | ((tag: Tag, obj: object, keyName: string | symbol) => void)
  | undefined;
export let teardownMandatorySetter: ((obj: object, keyName: string | symbol) => void) | undefined;
export let setWithMandatorySetter:
  | ((obj: object, keyName: string | symbol, value: any) => void)
  | undefined;

type PropertyDescriptorWithMeta = PropertyDescriptor & { hadOwnProperty?: boolean };

function isElementKey(key: string | number | symbol) {
  return typeof key === 'number' ? isPositiveInt(key) : isStringInt(key as string);
}

function isStringInt(str: string) {
  let num = parseInt(str, 10);
  return isPositiveInt(num) && str === String(num);
}

function isPositiveInt(num: number) {
  return num >= 0 && num % 1 === 0;
}

if (DEBUG) {
  let SEEN_TAGS = new WeakSet();

  let MANDATORY_SETTERS: WeakMap<
    object,
    // @ts-ignore
    { [key: string | symbol]: PropertyDescriptorWithMeta }
  > = new WeakMap();

  let propertyIsEnumerable = function (obj: object, key: string | symbol) {
    return Object.prototype.propertyIsEnumerable.call(obj, key);
  };

  setupMandatorySetter = function (tag: Tag, obj: object, keyName: string | symbol) {
    if (SEEN_TAGS.has(tag)) {
      return;
    }

    SEEN_TAGS!.add(tag);

    if (Array.isArray(obj) && isElementKey(keyName)) {
      return;
    }

    let desc = (lookupDescriptor(obj, keyName) as PropertyDescriptorWithMeta) || {};

    if (desc.get || desc.set) {
      // if it has a getter or setter, we can't install the mandatory setter.
      // native setters are allowed, we have to assume that they will resolve
      // to tracked properties.
      return;
    }

    if (desc && (!desc.configurable || !desc.writable)) {
      // if it isn't writable anyways, so we shouldn't provide the setter.
      // if it isn't configurable, we can't overwrite it anyways.
      return;
    }

    let setters = MANDATORY_SETTERS.get(obj);

    if (setters === undefined) {
      setters = {};
      MANDATORY_SETTERS.set(obj, setters);
    }

    desc.hadOwnProperty = Object.hasOwnProperty.call(obj, keyName);

    setters[keyName] = desc;

    Object.defineProperty(obj, keyName, {
      configurable: true,
      enumerable: propertyIsEnumerable(obj, keyName),

      get() {
        if (desc.get) {
          return desc.get.call(this);
        } else {
          return desc.value;
        }
      },

      set(value: any) {
        assert(
          `You attempted to update ${this}.${String(keyName)} to "${String(
            value
          )}", but it is being tracked by a tracking context, such as a template, computed property, or observer. In order to make sure the context updates properly, you must invalidate the property when updating it. You can mark the property as \`@tracked\`, or use \`@ember/object#set\` to do this.`
        );
      },
    });
  };

  teardownMandatorySetter = function (obj: object, keyName: string | symbol) {
    let setters = MANDATORY_SETTERS.get(obj);

    if (setters !== undefined && setters[keyName] !== undefined) {
      Object.defineProperty(obj, keyName, setters[keyName]);

      setters[keyName] = undefined;
    }
  };

  setWithMandatorySetter = function (obj: object, keyName: string | symbol, value: any) {
    let setters = MANDATORY_SETTERS.get(obj);

    if (setters !== undefined && setters[keyName] !== undefined) {
      let setter = setters[keyName];

      if (setter.set) {
        setter.set.call(obj, value);
      } else {
        setter.value = value;

        // If the object didn't have own property before, it would have changed
        // the enumerability after setting the value the first time.
        if (!setter.hadOwnProperty) {
          let desc = lookupDescriptor(obj, keyName);
          desc!.enumerable = true;

          Object.defineProperty(obj, keyName, desc!);
        }
      }
    } else {
      obj[keyName] = value;
    }
  };
}
