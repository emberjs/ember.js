import { template } from '@ember/template-compiler';
import Bootstrap from '../components/Bootstrap';
import EmberBootstrapRegistry from './../addons/ember-bootstrap';
import { extendRegistry, resoleFromRegistry } from '@/config/utils';
import { LinkTo } from '@ember/routing';

extendRegistry(EmberBootstrapRegistry);

const PageTitle = resoleFromRegistry('helper:page-title');

export default template(
  `
  {{title "Bootstrap"}}
  <LinkTo @route='main'>Home</LinkTo>
  <Bootstrap />
`,
  {
    scope: () => ({ LinkTo, Bootstrap, title: PageTitle }),
  }
);
