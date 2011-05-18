# How to Run Unit Tests

    cd amber
    spade update
    spade preview
    
Then visit: http://localhost:4020/tests.html?package=PACKAGE_NAME.  Please 'PACKAGE_NAME' with the name of the package you want to run.  For example:

  * [SproutCore Runtime](http://localhost:4020/tests.html?package=sproutcore-runtime)
  * [SproutCore Views](http://localhost:4020/tests.html?package=sproutcore-views)
  * [SproutCore DataStore](http://localhost:4020/tests.html?package=sproutcore-datastore)
  * [SproutCore Handlebars](http://localhost:4020/tests.html?package=sproutcore-handlebars)
  
# Adding New Packages

Be sure you include the new package as a dependency in the global `package.json` and run `spade update`.

Note that unless you are adding new __tests__ or adding a new package you should not need to run `spade update`.


  
