import { Component } from '@lifeart/gxt';
import { LinkTo } from '@ember/routing';
import { Textarea } from '@ember/-internals/glimmer';

export default class MainTemplate extends Component {
  <template>
    <section class="bg-white p-6 rounded shadow">
      <h1 class="text-2xl font-bold mb-4">List of Items</h1>
      <ul class="list-disc list-inside">
        {{#each @model as |item|}}
          <li class="mb-2">{{item}}</li>
        {{/each}}
      </ul>
    </section>
    <section class="bg-white p-6 rounded shadow mt-8">
        <h2 class="text-xl font-bold mb-4">Leave a Comment</h2>
        <Textarea class="w-full p-4 border rounded" rows="5" placeholder="Write your comment here..."></Textarea>
    </section>
  </template>
}
