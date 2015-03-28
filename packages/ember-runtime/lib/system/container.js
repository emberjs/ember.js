import { set } from "ember-metal/property_set";
import Registry from "container/registry";
import Container from "container/container";

Registry.set = set;
Container.set = set;

export { Registry, Container };
