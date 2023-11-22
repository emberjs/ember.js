# @glimmer/vm-babel-plugins

This package is meant to be used by hosting environments which use the Glimmer VM.
It exports a function which returns an array of babel plugins that should be
added to your Babel configuration.

```js
let vmBabelPlugins = require('@glimmer/vm-babel-plugins');

module.exports = {
  plugins: [...vmBabelPlugins({ isDebug: true })],
};
```

These plugins will remove debug tooling and assertions based on the `isDebug`
option. Currently, this is the only available option.
