# @glimmer/component

[![npm version](https://badge.fury.io/js/%40glimmer%2Fcomponent.svg)](https://badge.fury.io/js/%40glimmer%2Fcomponent)
[![CI](https://github.com/emberjs/ember.js/workflows/CI/badge.svg)](https://github.com/emberjs/ember.js/actions?query=workflow%3ACI)

## Installation

Add this package to your project:

```bash
npm install --save-dev @glimmer/component
```

## Usage

To use this in a Glimmer application, import the package and export an extended class:

```glimmer-ts
import Component from '@glimmer/component';

export default class MyComponent extends Component {
  get doubled() {
    return this.args.foo * 2;
  }

  <template>
    {{@foo}} * 2 === {{this.doubled}}
  </template>
}
```

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/emberjs/ember.js

## License

MIT License.
