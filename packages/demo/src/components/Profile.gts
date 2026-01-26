import { Component } from '@lifeart/gxt';
import { Input } from '@ember/-internals/glimmer';

function formatTimeForReadability(value) {
  return new Date(value).toLocaleTimeString();
}

export default class ProfileTemplate extends Component {
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
            <h1 class="text-2xl font-bold mb-4">Profile Page</h1>
            <div class="mb-4">
                <strong>Current Time:</strong> <span>{{formatTimeForReadability this.now}}</span>
            </div>
            <div class="mb-4">
                <strong>Query Param Value:</strong> <span>{{this.q}}</span>
            </div>
            <div class="mb-4">
                <label for="param-input" class="block text-gray-700">Update Value:</label>
                <Input type="text" id="param-input" class="w-full p-2 border rounded" @value={{this.q}} {{on "change" this.onInputChange}} />
            </div>
            <div class="flex space-x-4">
                <button type="button" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" {{on "click" this.toMain}}>Go to Main</button>
                <button type="button" id="increment-btn" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" {{on "click" this.incrementQp}}>Increment</button>
                <button type="button" id="decrement-btn" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700" {{on "click" this.decrementQp}}>Decrement</button>
            </div>
        </section>
  </template>
}
