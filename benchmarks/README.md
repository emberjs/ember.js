## Ember Benchmarks

```bash
npm install && grunt server
```

Open [localhost:8000](http://localhost:8000) in your browser.

### Folder structure

```
+ css
  // styles for the benchmarks UI
+ implementations
  // different versions of `Ember` that you want to run benchmarks against
+ lib
  + dependecies
    // other libraries that `Ember` depends on (jquery and handlebars)
  + suites
    // benchmarks
+ vendor
  // external dependencies for benchmark UI
```

### Files

+ `lib/app.js` is an `Ember` application that powers the UI
+ `lib/benchmark-runner` runs benchmarks and talks to the UI
+ `lib/runner` kicks off benchmarks execution
+ `lib/iframe-wrapper` wraps benchmarks and all dependecies in an iframe
  and appends to the main `document`
+ 'lib/config.js` is a place where benchmark configuration options
  reside.


### Adding new benchmark

First, you need to add an actual benchmark test under `suites` folder.
You will need to import `benchmark.js` itself.

After you're done writing the new benchmark, you need to add it to the
list of the benchmarks that are run each time. You need to edit
`lib/benchmarks.js` and add something like this: `import { suite as
new_bench } from './suites/new-benchmarks/new-benchmark'` and also
change `benchmarks` array (add `new-benchmark` as an element).

Note: benchmarks are written using ES6 modules and ES6 module
transpiler.
