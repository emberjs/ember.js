// Side-effect-only file. Registers the classic curly component manager
// for `Component` and seeds `positionalParams` on the base class.
//
// Kept separate from `./component` so that file's top-level evaluation
// has no side effects — bundlers can then tree-shake the classic
// `Component` class out of any bundle that doesn't otherwise need it
// (e.g. the hello-world that only pulls `setComponentManager` /
// `capabilities` from `@ember/component` via `@glimmer/component`).
//
// Classic apps opt back in to the registration via `./setup-registry`,
// which imports this module for its side effect.

import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';

import Component from './component';
import { CURLY_COMPONENT_MANAGER } from './component-managers/curly';

Component.reopenClass({
  positionalParams: [],
});

setInternalComponentManager(CURLY_COMPONENT_MANAGER, Component);
