/*
Public API for the container is still in flux.
The public API, specified on the application namespace should be considered the stable API.
// @module container
  @private
*/

export { default as Registry, privatize } from './lib/registry';
export { default as Container, FACTORY_FOR } from './lib/container';
