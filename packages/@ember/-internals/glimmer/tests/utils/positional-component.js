import { componentCapabilities } from '@glimmer/manager';
import { setComponentManager } from '@ember/-internals/glimmer';
import { setOwner } from '@ember/-internals/owner';

class PositionalComponentManager {
  constructor(owner) {
    this.capabilities = componentCapabilities('3.13', { updateHook: false });
    this.owner = owner;
  }

  createComponent(Factory, args) {
    return new Factory(this.owner, args);
  }

  getContext(component) {
    return component;
  }
}

/*
  A test-only component that receives positional arguments.

  Glimmer and template-only components take only named arguments,
  so tests of positional arguments render this class.

  `static positionalParams` names the positional arguments:

  - a list of names gives one property per argument
      ['name', 'age']  →  this.name, this.age
  - a single name gives one property with all of them
      'names'  →  this.names

  Named arguments stay on `@name` in the template.
*/
class PositionalComponent {
  static positionalParams = [];

  constructor(owner, args) {
    setOwner(this, owner);

    let names = this.constructor.positionalParams;
    let { positional } = args;

    if (typeof names === 'string') {
      Object.defineProperty(this, names, {
        get: () => {
          let values = [];

          for (let i = 0; i < positional.length; i++) {
            values.push(positional[i]);
          }

          return values;
        },
      });
    } else {
      for (let i = 0; i < names.length; i++) {
        Object.defineProperty(this, names[i], { get: () => positional[i] });
      }
    }
  }
}

setComponentManager((owner) => new PositionalComponentManager(owner), PositionalComponent);

export default PositionalComponent;
