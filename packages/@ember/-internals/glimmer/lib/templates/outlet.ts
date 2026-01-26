import { hbs } from '@lifeart/gxt';
import Outlet from './outlet-helper-component';

export default (owner) => {
  globalThis.owner = owner;
  return function (args) {
    return hbs`{{#let (component Outlet state=(args.state)) as |Outlet|}}
      <Outlet />
    {{/let}}`;
  };
};
