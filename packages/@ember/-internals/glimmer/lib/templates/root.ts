import { hbs, $_fin } from '@lifeart/gxt';
export default function(owner) {
  console.log('root-template init', owner);
  return function(rootState) {
    // console.log('root-template - render', [this], [...arguments]);
    // temp1.root.template
    // console.log(...arguments);
    // return function() {
    //   console.log(...arguments);
    //   return $_fin([...rootState.root.template()], this);
    // }
    // debugger;
    const state = rootState.root.ref;
    const owner = rootState.render.owner;
    console.log('rootState', state);
    return hbs`
      {{log 'root-template-create' this rootState}}
      {{#let (component rootState.root.template state=state owner=owner root=true) as |Layout|}}
        <Layout />
      {{/let}}
    `;
  }
}
