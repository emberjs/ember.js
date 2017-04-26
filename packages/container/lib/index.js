/*
Public API for the container is still in flux.
The public API, specified on the application namespace should be considered the stable API.
// @module container
  @private
*/

export { default as Registry, privatize } from './registry';
export {
  default as Container,
  buildFakeContainerWithDeprecations,
  FACTORY_FOR,
  LOOKUP_FACTORY,
  peekFactoryManager,
  setFactoryManager
} from './container';
