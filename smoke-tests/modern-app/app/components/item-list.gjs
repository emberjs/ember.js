import formatPrice from '../helpers/format-price.js';

<template>
  <ul data-test-items>
    {{#each @items as |item index|}}
      {{#let (formatPrice item.price) as |price|}}
        <li>{{index}}: {{item.name}} {{price}}</li>
      {{/let}}
    {{else}}
      <li>empty</li>
    {{/each}}
  </ul>
  {{#if @showCount}}
    <p data-test-item-count>{{@items.length}} items</p>
  {{/if}}
</template>
