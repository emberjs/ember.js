// @glimmer/component reached from the app AND from an installed addon that
// hard-depends on a different @glimmer/component version (nested copy in
// node_modules): the build must still hold exactly one copy.
import Component from '@glimmer/component';
import { AddonBase, AddonComponent } from 'local-glimmer-addon';

document.title = String(AddonBase === Component && AddonComponent.prototype instanceof Component);
