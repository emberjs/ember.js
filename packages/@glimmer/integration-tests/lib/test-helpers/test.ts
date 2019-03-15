import { ComponentTestMeta } from '../test-decorator';
import { Dict } from '@glimmer/interfaces';
import { keys } from '@glimmer/util';

export function test(meta: ComponentTestMeta): MethodDecorator;
export function test(
  _target: Object | ComponentTestMeta,
  _name?: string,
  descriptor?: PropertyDescriptor
): PropertyDescriptor | void;
export function test(...args: any[]) {
  if (args.length === 1) {
    let meta: ComponentTestMeta = args[0];
    return (_target: Object, _name: string, descriptor: PropertyDescriptor) => {
      let testFunction = descriptor.value as Function & Dict;
      keys(meta).forEach(key => (testFunction[key] = meta[key]));
      setTestingDescriptor(descriptor);
    };
  }

  let descriptor = args[2];
  setTestingDescriptor(descriptor);
  return descriptor;
}

function setTestingDescriptor(descriptor: PropertyDescriptor): void {
  let testFunction = descriptor.value as Function & Dict;
  descriptor.enumerable = true;
  testFunction['isTest'] = true;
}
