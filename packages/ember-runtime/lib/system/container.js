import { set } from 'ember-metal/property_set';
import Registry from 'container/registry';
import Container from 'container/container';
import { getOwner, setOwner } from 'container/owner';

Registry.set = set;
Container.set = set;

export { Registry, Container, getOwner, setOwner };
