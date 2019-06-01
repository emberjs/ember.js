import { Meta } from '@ember/-internals/meta';
import {
  consume,
  Decorator,
  DecoratorPropertyDescriptor,
  isElementDescriptor,
  setClassicDecorator,
  tagForProperty,
  track,
  update,
} from '@ember/-internals/metal';
import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { assert } from '@ember/debug';

let wrapGetterSetter = function(_target: object, key: string, desc: PropertyDescriptor) {
  let { get: originalGet } = desc;

  if (originalGet !== undefined) {
    desc.get = function() {
      let propertyTag = tagForProperty(this, key);
      let ret;

      let tag = track(() => {
        ret = originalGet!.call(this);
      });

      update(propertyTag, tag);
      consume(tag);

      return ret;
    };
  }

  return desc;
};

export function dependentKeyCompat(
  target: object,
  key: string,
  desc: PropertyDescriptor
): PropertyDescriptor;
export function dependentKeyCompat(desc: { get?: Function; set?: Function }): Decorator;
export function dependentKeyCompat(
  target: object | { get?: Function; set?: Function },
  key?: string,
  desc?: PropertyDescriptor
) {
  assert(
    'The dependentKeyCompat decorator can only be used if the tracked properties feature is enabled',
    Boolean(EMBER_METAL_TRACKED_PROPERTIES)
  );

  if (!isElementDescriptor([target, key, desc])) {
    desc = target as PropertyDescriptor;

    let decorator = function(
      target: object,
      key: string,
      _desc: DecoratorPropertyDescriptor,
      _meta?: Meta,
      isClassicDecorator?: boolean
    ) {
      assert(
        'The @dependentKeyCompat decorator may only be passed a method when used in classic classes. You should decorate getters/setters directly in native classes',
        isClassicDecorator
      );

      assert(
        'The dependentKeyCompat() decorator must be passed a getter or setter when used in classic classes',
        desc !== null &&
          typeof desc === 'object' &&
          (typeof desc.get === 'function' || typeof desc.set === 'function')
      );

      return wrapGetterSetter(target, key, desc!);
    };

    setClassicDecorator(decorator);

    return decorator as Decorator;
  }

  assert(
    'The @dependentKeyCompat decorator must be applied to getters/setters when used in native classes',
    (desc !== null && typeof desc!.get === 'function') || typeof desc!.set === 'function'
  );

  return wrapGetterSetter(target, key!, desc!);
}

setClassicDecorator(dependentKeyCompat as Decorator);
