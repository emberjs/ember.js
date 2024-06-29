import { precompileTemplate } from '@ember/template-compilation';
import { hbs } from '@lifeart/gxt';
import { outletHelper } from '../syntax/outlet';
import Outlet from './outlet-helper-component';


export default (owner) => {
  console.log('outlet factory', owner);
  globalThis.owner = owner;
  return function(args) {
    console.log('outlet', this, owner, ...arguments);
    return hbs`{{#let (component Outlet state=(args.state)) as |Outlet|}}
      <div>[main outlet template]<Outlet /></div>
    {{/let}}`;
  }
}
