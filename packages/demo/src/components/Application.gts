import { Component } from '@lifeart/gxt';
import { LinkTo } from '@ember/routing';

export default class ApplicationTemplate extends Component {
  <template>
     <header class="bg-blue-600 p-4">
        <nav class="container mx-auto flex justify-between items-center">
            <div class="text-white text-lg font-bold">
                Ember.js
            </div>
            <div class="space-x-4">
                <LinkTo @route="main" class="underline text-white hover:text-gray-300">Home</LinkTo>
                <LinkTo @route="profile" class="underline text-white hover:text-gray-300">Profile</LinkTo>
            </div>
        </nav>
    </header>
    <main class="container mx-auto mt-8">
      {{outlet}}
    </main>
  </template>
}
