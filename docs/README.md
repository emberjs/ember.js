Ember Documentation
========================

Generating the Ember documentation requires node.js, as well as the port of jsdoc-toolkit to node, located [here](https://github.com/p120ph37/node-jsdoc-toolkit). In order to build the docs, run the following commands from the `docs` directory:

    git clone git://github.com/p120ph37/node-jsdoc-toolkit jsdoc
    ./run

This will build the documentation in the `output` directory. Once you have the jsdoc-toolkit, you don't need to issue the `git clone` command again.
    
But for the time being there is a bug in that port of jsdoc-toolkit wich causes problem with the most recent node.js.
An alternative is to use a corrected version of that port located [here](https://github.com/dudleyf/node-jsdoc-toolkit). dudleyf corrected it!

So the above command would become: (we take the one from dudleyf and use his nodescript branch wich contain the correction.)
Using that, running ./run won't fail with latest node.js installed.

    git clone git://github.com/dudleyf/node-jsdoc-toolkit jsdoc
    cd jsdoc
    git checkout nodescript
    cd ..
    ./run

If you wish to consult it without installing node.js and the toolkit a static version is provided [here](https://s3.amazonaws.com/emberjs/emberjs-docs-as-of-2012-01-04.zip).
Please note that it will not be as up to date as building it yourself but it is provided as a convenience for the time being.