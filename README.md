# How to Run Unit Tests

1. Install Ruby and Rubygems. There are many resources on the web can help you to do so, one of the best ways may be [rvm](http://rvm.beginrescueend.com/).

2. Install spade: `gem install spade` (WARNING: There is a bug in RubyGems 1.7.2, please upgrade to 1.8.5+ or downgrade.)

3. Install sproutcore-preprocessor via `spadepkg install sproutcore-preprocessor`.

3. Enter the following commands in your command shell:

        cd sproutcore20
        spaderun update
        spaderun preview
    
4. Then visit: http://localhost:4020/tests.html?package=PACKAGE_NAME.  Replace 'PACKAGE_NAME' with the name of the package you want to run.  For example:

  * [SproutCore Runtime](http://localhost:4020/tests.html?package=sproutcore-runtime)
  * [SproutCore Views](http://localhost:4020/tests.html?package=sproutcore-views)
  * [SproutCore DataStore](http://localhost:4020/tests.html?package=sproutcore-datastore)
  * [SproutCore Handlebars](http://localhost:4020/tests.html?package=sproutcore-handlebars)
  
# Adding New Packages

Be sure you include the new package as a dependency in the global `package.json` and run `spaderun update`.

Note that unless you are adding new __tests__ or adding a new package you should not need to run `spaderun update`.

# Building SproutCore 2.0

1. Follow the installation instructions for running the unit tests.

2. Install Bundler via `gem install bundler`

3. Install Node.js and npm. Refer to the Node.js instructions [here](https://github.com/joyent/node/wiki/Installation).

4. Install uglify-js via `npm install -g uglify-js`.

5. Run `bundle install` to pull in Ruby dependencies.

6. Run `rake` to build SproutCore. The build will be placed in the tmp directory.
