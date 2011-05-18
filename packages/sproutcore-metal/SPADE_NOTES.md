# Converting To Spade

This framework has been designed to convert to a fully spade-friendly format when ready.  Here are the changes you should make:

1. Move core.js, mixins, and system into a lib directory
2. Add a package.json
3. Convert all sc\_require() methods to just require().  Be sure to change all paths to use relative paths.
4. Move the debug/suites directory to test/suites.
5. Add explicit requires to the top of each unit test.

    require('core-test/qunit');
    require('sproutcore-metal/...'); <-- whatever is being tested
    
