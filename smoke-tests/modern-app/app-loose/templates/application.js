import { precompileTemplate } from '@ember/template-compilation';

export default precompileTemplate(
  `<nav>
    <LinkTo @route="index" data-test-link-index>Home</LinkTo>
    <LinkTo @route="about" data-test-link-about>About</LinkTo>
  </nav>
  <main>{{outlet}}</main>`
);
