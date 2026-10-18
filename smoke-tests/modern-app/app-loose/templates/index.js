import { precompileTemplate } from '@ember/template-compilation';

export default precompileTemplate(`<h1 data-test-title>Modern app</h1>
<Counter @label="main" />`);
