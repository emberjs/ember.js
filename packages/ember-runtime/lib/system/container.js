import {
  Registry,
  Container,
  getOwner,
  setOwner
} from 'container';
import { set } from 'ember-metal/property_set';

Registry.set = set;
Container.set = set;

export { Registry, Container, getOwner, setOwner };
