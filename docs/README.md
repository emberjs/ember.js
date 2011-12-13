Ember Documentation
========================

Generating the Ember documentation requires node.js, as well as the port of jsdoc-toolkit to node, located [here](https://github.com/p120ph37/node-jsdoc-toolkit). In order to build the docs, run the following commands from the `docs` directory:

    git clone git://github.com/p120ph37/node-jsdoc-toolkit jsdoc
    ./run

This will build the documentation in the `output` directory. Once you have the jsdoc-toolkit, you don't need to issue the `git clone` command again.