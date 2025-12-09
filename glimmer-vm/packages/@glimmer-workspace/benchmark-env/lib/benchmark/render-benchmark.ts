import type {
  Dict,
  EvaluationContext,
  ResolvedComponentDefinition,
  RuntimeArtifacts,
  SimpleElement,
} from '@glimmer/interfaces';
import { NewTreeBuilder, renderComponent, renderSync } from '@glimmer/runtime';

import type { UpdateBenchmark } from '../interfaces';

import { registerResult } from './create-env-delegate';
import { measureRender } from './util';

export default async function renderBenchmark(
  _artifacts: RuntimeArtifacts,
  context: EvaluationContext,
  component: ResolvedComponentDefinition,
  args: Dict,
  element: SimpleElement
): Promise<UpdateBenchmark> {
  let resolveRender: (() => void) | undefined;

  await measureRender('render', 'renderStart', 'renderEnd', () => {
    const env = context.env;
    const cursor = { element, nextSibling: null };
    const treeBuilder = NewTreeBuilder.forInitialRender(env, cursor);

    const result = renderSync(
      env,
      renderComponent(context, treeBuilder, {}, component.state, args)
    );

    registerResult(result, () => {
      if (resolveRender !== undefined) {
        resolveRender();
        resolveRender = undefined;
      }
    });
  });

  performance.measure('load', 'navigationStart', 'renderStart');

  return async (name, update) => {
    await measureRender(
      name,
      name + 'Start',
      name + 'End',
      () =>
        new Promise((resolve) => {
          resolveRender = resolve;
          update();
        })
    );
  };
}
