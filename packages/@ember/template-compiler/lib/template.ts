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
  options?: Partial<EmberPrecompileOptions>
): object {
  const evaluate = buildEvaluator(options);

  const normalizedOptions = compileOptions(options);
  const component = normalizedOptions.component ?? templateOnly();

  queueMicrotask(() => {
    const source = glimmerPrecompile(templateString, normalizedOptions);
    const template = templateFactory(evaluate(`(${source})`) as SerializedTemplateWithLazyBlock);

    setComponentTemplate(template, component);
  });

  return component;
}

const evaluator = (source: string) => {
  return new Function(`return ${source}`)();
};

function buildEvaluator(options: Partial<EmberPrecompileOptions> | undefined) {
  if (options === undefined) {
    return evaluator;
  }

  if (options.eval) {
    return options.eval;
  } else {
    const scope = options.scope?.();

    if (!scope && options.component) {
      return evaluator;
    }

    assert(`The 'template' function must be called with an evaluator, scope or component`, scope);

    return (source: string) => {
      const argNames = Object.keys(scope);
      const argValues = Object.values(scope);

      return new Function(...argNames, `return (${source})`)(...argValues);
    };
  }
}
