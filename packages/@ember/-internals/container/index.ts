/*
Public API for the container is still in flux.
The public API, specified on the application namespace should be considered the stable API.
// @module container
  @private
*/

export { default as Registry, type ResolverClass, privatize } from './lib/registry';
export { default as Container, getFactoryFor, setFactoryFor, INIT_FACTORY } from './lib/container';
