/*
Public API for the container is still in flux.
The public API, specified on the application namespace should be considered the stable API.
// @module container
  @private
*/

export { default as Registry, privatize } from './registry';
export {
  default as Container,
  FACTORY_FOR,
  factoryForWithRawString,
  lookupWithRawString,
  RAW_STRING_OPTION_KEY as _RAW_STRING_OPTION_KEY
} from './container';
