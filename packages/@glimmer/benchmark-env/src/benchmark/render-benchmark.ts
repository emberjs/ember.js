import { SimpleElement } from '@simple-dom/interface';
import { Dict, RuntimeResolverDelegate } from '@glimmer/interfaces';
import { setPropertyDidChange } from '@glimmer/validator';
import { ComponentRootReference } from '@glimmer/reference';
import {
  NewElementBuilder,
  JitRuntime,
  JitSyntaxCompilationContext,
  renderJitMain,
  renderSync,
} from '@glimmer/runtime';

import createEnvDelegate from './create-env-delegate';
import { measureRender } from './util';
import { UpdateBenchmark } from '../interfaces';

export default async function renderBenchmark(
  context: JitSyntaxCompilationContext,
  runtimeResolverDelegate: RuntimeResolverDelegate,
  entry: number,
  element: SimpleElement,
  root: Dict,
  isInteractive = true
): Promise<UpdateBenchmark> {
  let resolveRender: (() => void) | undefined;
  await measureRender('render', 'renderStart', 'renderEnd', () => {
    const document = element.ownerDocument;
    const envDelegate = createEnvDelegate(isInteractive);
    const runtime = JitRuntime(
      {
        document,
      },
      envDelegate,
      context,
      runtimeResolverDelegate
    );
    const env = runtime.env;
    const cursor = { element, nextSibling: null };
    const result = renderSync(
      env,
      renderJitMain(
        runtime,
        context,
        new ComponentRootReference(root, env),
        NewElementBuilder.forInitialRender(env, cursor),
        entry
      )
    );

    let scheduled = false;
    setPropertyDidChange(() => {
      if (!scheduled) {
        Promise.resolve().then(() => {
          const { env } = result;
          env.begin();
          result.rerender();
          scheduled = false;
          env.commit();
          // only resolve if commit didn't dirty again
          if (!scheduled && resolveRender !== undefined) {
            resolveRender();
            resolveRender = undefined;
          }
        });
      }
    });
  });

  performance.measure('load', 'navigationStart', 'compileStart');
  performance.measure('compile', 'compileStart', 'renderStart');

  return async (name, update) => {
    await measureRender(
      name,
      name + 'Start',
      name + 'End',
      () =>
        new Promise(resolve => {
          resolveRender = resolve;
          update();
        })
    );
  };
}
