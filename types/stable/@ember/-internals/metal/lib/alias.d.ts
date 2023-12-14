declare module '@ember/-internals/metal/lib/alias' {
  import type { Meta } from '@ember/-internals/meta';
  import type { ExtendedMethodDecorator } from '@ember/-internals/metal/lib/decorator';
  import { ComputedDescriptor } from '@ember/-internals/metal/lib/decorator';
  export type AliasDecorator = ExtendedMethodDecorator & PropertyDecorator & AliasDecoratorImpl;
  export default function alias(altKey: string): AliasDecorator;
  class AliasDecoratorImpl extends Function {
    readOnly(this: ExtendedMethodDecorator): ExtendedMethodDecorator;
    oneWay(this: ExtendedMethodDecorator): ExtendedMethodDecorator;
    meta(this: ExtendedMethodDecorator, meta?: any): any;
  }
  export class AliasedProperty extends ComputedDescriptor {
    readonly altKey: string;
    constructor(altKey: string);
    setup(obj: object, keyName: string, propertyDesc: PropertyDescriptor, meta: Meta): void;
    get(obj: object, keyName: string): any;
    set(obj: object, _keyName: string, value: any): any;
    readOnly(): void;
    oneWay(): void;
  }
  export {};
}
