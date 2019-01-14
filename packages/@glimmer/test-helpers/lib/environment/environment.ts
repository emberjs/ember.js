import { Dict, RuntimeProgram, WholeProgramCompilationContext } from '@glimmer/interfaces';
import { isConst, OpaqueIterable, Reference } from '@glimmer/reference';
import { ConditionalReference, EnvironmentImpl, PrimitiveReference } from '@glimmer/runtime';
import { Iterable, KeyFor } from './iterable';

export type TestProgram = RuntimeProgram & WholeProgramCompilationContext;

export default abstract class TestEnvironment extends EnvironmentImpl {
  protocolForURL(url: string): string {
    if (typeof window === 'undefined') {
      let match = /^([a-z][a-z0-9.+-]*:)?(\/\/)?([\S\s]*)/i.exec(url);
      return match && match[1] ? match[1].toLowerCase() : '';
    }

    let anchor = window.document.createElement('a');
    anchor.href = url;
    return anchor.protocol;
  }

  toConditionalReference(reference: Reference<any>): Reference<boolean> {
    if (isConst(reference)) {
      return PrimitiveReference.create(emberToBool(reference.value()));
    }

    return new ConditionalReference(reference, emberToBool);
  }

  iterableFor(ref: Reference<unknown>, keyPath: string): OpaqueIterable {
    let keyFor: KeyFor<unknown>;

    if (!keyPath) {
      throw new Error('Must specify a key for #each');
    }

    switch (keyPath) {
      case '@index':
        keyFor = (_, index: unknown) => String(index);
        break;
      case '@primitive':
        keyFor = (item: unknown) => String(item);
        break;
      case '@identity':
        keyFor = (item: unknown) => item;
        break;
      default:
        keyFor = (item: unknown) => item && (item as Dict)[keyPath];
        break;
    }

    return new Iterable(ref, keyFor);
  }
}

export function emberToBool(value: any): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  } else {
    return !!value;
  }
}
