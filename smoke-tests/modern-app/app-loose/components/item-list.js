import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';

export default setComponentTemplate(
  precompileTemplate(
    `<ul data-test-items>
      {{#each @items as |item index|}}
        {{#let (format-price item.price) as |price|}}
          <li>{{index}}: {{item.name}} {{price}}</li>
        {{/let}}
      {{else}}
        <li>empty</li>
      {{/each}}
    </ul>
    {{#if @showCount}}
      <p data-test-item-count>{{@items.length}} items</p>
    {{/if}}`
  ),
  templateOnly()
);
