import { PathReference } from '@glimmer/reference';
import { ElementBuilder, renderSync } from '@glimmer/runtime';
import { BasicComponent } from './environment/components/basic';
import { EmberishCurlyComponent } from './environment/components/emberish-curly';
import { EmberishGlimmerComponent } from './environment/components/emberish-glimmer';
import { ComponentKind, ComponentTypes, LazyEnv } from './interfaces';
import { RenderResult } from '@glimmer/interfaces';

export function registerComponent<K extends ComponentKind>(
  env: LazyEnv,
  type: K,
  name: string,
  layout: string,
  Class?: ComponentTypes[K]
): void {
  switch (type) {
    case 'Glimmer':
      env.registerEmberishGlimmerComponent(name, Class as typeof EmberishGlimmerComponent, layout);
      break;
    case 'Curly':
      env.registerEmberishCurlyComponent(name, Class as typeof EmberishCurlyComponent, layout);
      break;

    case 'Dynamic':
      env.registerEmberishCurlyComponent(name, Class as typeof EmberishCurlyComponent, layout);
      break;
    case 'Basic':
    case 'Fragment':
      env.registerBasicComponent(name, Class as typeof BasicComponent, layout);
      break;
  }
}

export function renderTemplate(
  src: string,
  env: LazyEnv,
  self: PathReference<unknown>,
  builder: ElementBuilder
): RenderResult {
  let template = env.preprocess(src);
  let iterator = env.renderMain(template, self, builder);
  return renderSync(env, iterator);
}
