import { renderComponent } from '@glimmer/dom';

renderComponent(
  <template>hi </template>,
  {
    into: document.body,
  }
);
