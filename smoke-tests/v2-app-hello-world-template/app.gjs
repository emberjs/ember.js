import { renderComponent } from '@ember/renderer';

renderComponent(
  <template>hi </template>,
  {
    into: document.body,
  }
);
