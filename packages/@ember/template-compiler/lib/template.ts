import templateOnly from '@ember/component/template-only';
import { assert } from '@ember/debug';
import { precompile as glimmerPrecompile } from '@glimmer/compiler';
import type { SerializedTemplateWithLazyBlock } from '@glimmer/interfaces';
import { setComponentTemplate } from '@glimmer/manager';
import { templateFactory } from '@glimmer/opcode-compiler';
import compileOptions from './compile-options';
import type { EmberPrecompileOptions } from './types';

export function template(
  templateString: string,
  options: Partial<EmberPrecompileOptions> = {}
): object {
  const evaluate = options.eval;

  // @todo support the explicit form
  assert(`The 'template' function must be called with an evaluator`, evaluate);

  const normalizedOptions = compileOptions(options);
  const component = normalizedOptions.component ?? templateOnly();

  queueMicrotask(() => {
    const source = glimmerPrecompile(templateString, normalizedOptions);
    const template = templateFactory(evaluate(`(${source})`) as SerializedTemplateWithLazyBlock);

    setComponentTemplate(template, component);
  });

  return component;
}
