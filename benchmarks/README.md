# Extremely simple Ember benchmarks

To run the benchmarks, serve the repository root on a web server (`gem install
asdf; asdf`), run `rake` to build Ember, and open e.g.
`http://localhost:9292/benchmarks/index.html?suitePath=plain_object.js` to run
`benchmarks/suites/plain_object.js`. Run `cp -r dist distold` to benchmark
different versions against each other.
