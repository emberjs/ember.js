import type Component from '../component';

/*
  Swapped in for './root' when CLASSIC_COMPONENTS is disabled (see
  legacySections() in rollup.config.mjs). The root-component render path is
  only reachable through the classic Component's appendTo/append, which does
  not exist in builds without classic components — this stub exists so the
  renderer's import does not drag the curly component manager into those
  builds.
*/
export class RootComponentDefinition {
  constructor(_component: Component) {
    throw new Error(
      'BUG: the classic component root render path is unreachable in a build without classic components'
    );
  }
}
