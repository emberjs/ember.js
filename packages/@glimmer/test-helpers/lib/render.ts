import { PathReference } from '@glimmer/reference';
import { ElementBuilder, renderSync, renderJitMain } from '@glimmer/runtime';
import { BasicComponent } from './environment/components/basic';
import { EmberishCurlyComponent } from './environment/components/emberish-curly';
import { EmberishGlimmerComponent } from './environment/components/emberish-glimmer';
import { ComponentKind, ComponentTypes } from './interfaces';
import {
  RenderResult,
  SyntaxCompilationContext,
  RuntimeContext,
  JitRuntimeContext,
} from '@glimmer/interfaces';
import { preprocess } from './environment/shared';
import LazyRuntimeResolver from './environment/modes/lazy/runtime-resolver';
import {
  registerEmberishGlimmerComponent,
  registerEmberishCurlyComponent,
  registerBasicComponent,
} from './environment/modes/lazy/register';

export function registerComponent<K extends ComponentKind>(
  resolver: LazyRuntimeResolver,
  type: K,
  name: string,
  layout: string,
  Class?: ComponentTypes[K]
): void {
  switch (type) {
    case 'Glimmer':
      registerEmberishGlimmerComponent(
        resolver,
        name,
        Class as typeof EmberishGlimmerComponent,
        layout
      );
      break;
    case 'Curly':
      registerEmberishCurlyComponent(
        resolver,
        name,
        Class as typeof EmberishCurlyComponent,
        layout
      );
      break;

    case 'Dynamic':
      registerEmberishCurlyComponent(
        resolver,
        name,
        Class as typeof EmberishCurlyComponent,
        layout
      );
      break;
    case 'Basic':
    case 'Fragment':
      registerBasicComponent(resolver, name, Class as typeof BasicComponent, layout);
      break;
  }
}

export interface TestDelegateContext {
  runtime: RuntimeContext;
  syntax: SyntaxCompilationContext;
}

export interface JitTestDelegateContext {
  runtime: JitRuntimeContext;
  syntax: SyntaxCompilationContext;
}

export function renderTemplate(
  src: string,
  { runtime, syntax }: JitTestDelegateContext,
  self: PathReference<unknown>,
  builder: ElementBuilder
): RenderResult {
  let template = preprocess(src);
  let iterator = renderJitMain(runtime, syntax, self, builder, template.asLayout().compile(syntax));
  return renderSync(runtime.env, iterator);
}
