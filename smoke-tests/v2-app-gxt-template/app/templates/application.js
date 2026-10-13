// Route templates compile at RUNTIME through the GXT build's
// `@ember/template-compilation` shim (which drives
// `@lifeart/gxt/runtime-compiler`). This is the same path the GXT test
// suite's route-render coverage exercises, and it needs no build-time
// template plugin in the consuming app.
import { precompileTemplate } from '@ember/template-compilation';

export default precompileTemplate(
  `<h1 data-test-title>Hello from Ember on GXT</h1>
  <p data-test-count>Count: {{this.count}}</p>
  <button type="button" data-test-increment {{on "click" this.increment}}>+1</button>
  <Counter @count={{this.count}} @increment={{this.increment}} />
  <ForwardedLink href={{this.linkUrl}} title="static" data-count={{this.count}} {{on "click" this.followLink}} as |kind|>{{kind}} link {{this.count}}</ForwardedLink>
  <button type="button" data-test-swap-link {{on "click" this.swapLink}}>swap link</button>
  <p data-test-link-clicks>Link clicks: {{this.linkClicks}}</p>
  <ClassCounter @count={{this.count}} @increment={{this.increment}} />`
);
