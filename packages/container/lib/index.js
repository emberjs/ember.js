/*
Public API for the container is still in flux.
The public API, specified on the application namespace should be considered the stable API.
// @module container
  @private
*/

import Registry from './registry';
import Container from './container';
import { getOwner, setOwner } from './owner';

export { Registry, Container, getOwner, setOwner };
