import { IteratorResult, RenderResult, VM } from './vm';
import { RuntimeProgram } from "./vm/append";
import { ElementBuilder } from './vm/element-builder';
import { DynamicScope, Environment } from './environment';
import { PathReference } from "@glimmer/reference";
import { Opaque } from "@glimmer/interfaces";

export interface TemplateIterator {
  next(): IteratorResult<RenderResult>;
}

class TemplateIteratorImpl<T> implements TemplateIterator {
  constructor(private vm: VM<T>) {}
  next(): IteratorResult<RenderResult> {
    return this.vm.next();
  }
}

export default function render<T>(
  program: RuntimeProgram<T>,
  env: Environment,
  self: PathReference<Opaque>,
  dynamicScope: DynamicScope,
  builder: ElementBuilder,
  handle: number
): TemplateIterator {
  let vm = VM.initial(program, env, self, dynamicScope, builder, handle);
  return new TemplateIteratorImpl(vm);
}
