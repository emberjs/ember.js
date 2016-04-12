/*
Public API for the container is still in flux.
The public API, specified on the application namespace should be considered the stable API.
// @module container
  @private
*/

import Registry from 'container/registry';
import Container from 'container/container';
import { getOwner, setOwner } from 'container/owner';

export { Registry, Container, getOwner, setOwner };
