import { KeyFor, Iterable } from './iterable';

import { Environment, DOMTreeConstruction, IDOMChanges, PrimitiveReference, ConditionalReference } from "@glimmer/runtime";
import { dict } from "@glimmer/util";
import { Dict, Resolver, Opaque } from "@glimmer/interfaces";
import { VMHandle } from "@glimmer/opcode-compiler";
import { Program } from "@glimmer/program";
import { Reference, isConst, OpaqueIterable } from "@glimmer/reference";

export interface EnvironmentOptions {
  appendOperations: DOMTreeConstruction;
  updateOperations: IDOMChanges;
}

export abstract class AbstractTestEnvironment<Specifier> extends Environment {
  public compiledLayouts: Dict<VMHandle> = dict();

  protected abstract program: Program<Specifier>;
  protected abstract resolver: Resolver<Specifier>;

  protocolForURL(url: string): string {
    if (typeof window === 'undefined') {
      throw new Error('Must implement protocolForURL outside of the browser');
    }

    let anchor = window.document.createElement('a');
    anchor.href = url;
    return anchor.protocol;
  }

  toConditionalReference(reference: Reference<any>): Reference<boolean> {
    if (isConst(reference)) {
      return PrimitiveReference.create(emberToBool(reference.value()));
    }

    return new EmberishConditionalReference(reference);
  }

  iterableFor(ref: Reference<Opaque>, keyPath: string): OpaqueIterable {
    let keyFor: KeyFor<Opaque>;

    if (!keyPath) {
      throw new Error('Must specify a key for #each');
    }

    switch (keyPath) {
      case '@index':
        keyFor = (_, index: number) => String(index);
        break;
      case '@primitive':
        keyFor = (item: Opaque) => String(item);
        break;
      default:
        keyFor = (item: Opaque) => item && item[keyPath];
        break;
    }

    return new Iterable(ref, keyFor);
  }
}

function emberToBool(value: any): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  } else {
    return !!value;
  }
}

class EmberishConditionalReference extends ConditionalReference {
  protected toBool(value: any): boolean {
    return emberToBool(value);
  }
}
