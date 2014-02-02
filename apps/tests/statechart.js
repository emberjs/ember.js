// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2013 7x7 Software, Inc.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global TestRunner, CoreTools */


/**
  Application statechart.
*/
TestRunner.statechart = SC.Object.create(SC.StatechartManager, {

  trace: false,

  rootState: SC.State.extend({
    initialSubstate: 'loadingTargets',

    loadingTargets: SC.State.extend({

      enterState: function () {
        var targets = TestRunner.store.find(CoreTools.TARGETS_QUERY);

        TestRunner.set('currentScene', 'targetsLoading');

        TestRunner.targetsController.set('content', targets);
        return SC.Async.perform();
      }

    }),

    readyTargets: SC.State.extend({

      initialSubstate: 'noSelectedTarget',

      /**
        Invoked when you select a target.
      */
      selectTarget: function (sender) {
        var selection = sender.get('selection'),
          target = selection.get('firstObject');

        // Give bindings a chance to flush.
        this.invokeLast(function () {
          if (target) {
            this.gotoState('selectedTarget');
          } else {
            this.gotoState('noSelectedTarget');
          }
        });
      },

      noSelectedTarget: SC.State.extend({

        representRoute: '',

        enterState: function () {
          var hasTargets = TestRunner.targetsController.get('length') > 0;

          if (hasTargets) {
            TestRunner.set('currentScene', 'testsNone');
          } else {
            TestRunner.set('currentScene', 'noTests');
          }

          document.title = "_Window Title".loc('_No Target'.loc());
          this.set('location', '');
        }

      }),

      selectedTarget: SC.State.extend({

        initialSubstate: 'noSelectedTest',

        enterState: function () {
          var target = TestRunner.targetController.get('content'),
            tests = target.get('tests'),
            ret = true;

          if (tests && (tests.get('status') & SC.Record.BUSY)) {
            TestRunner.set('currentScene', 'testsLoading');

            ret = SC.Async.perform();
          }

          return ret;
        },

        enterStateByRoute: function (context) {
          var name = context.params.target,
            target,
            tests;

          // Select the proper target.
          target = TestRunner.targetsController.findProperty('name', '/' + name.replace(/-/g, '/'));
          TestRunner.targetsController.selectObject(target);
          tests = target.get('tests');

          if (tests.get('status') & SC.Record.BUSY) {
            // This will call resumeGotoState.
            TestRunner.set('currentScene', 'testsLoading');
          } else {
            // Resume after the bindings have flushed.
            this.invokeLast(function () {
              this.resumeGotoState();
            }, this);
          }

          return SC.Async.perform();
        },

        noSelectedTest: SC.State.extend({

          representRoute: ':target',

          /**
            Invoked when you select a test.
          */
          selectTest: function (sender) {
            var selection = sender.get('selection'),
              target = selection.get('firstObject');

            // Give bindings a chance to flush.
            this.invokeLast(function () {
              if (target) {
                this.gotoState('selectedTest');
              } else {
                this.gotoState('noSelectedTest');
              }
            });
          },

          // runTests: function (sender) {
          //   this.gotoState('allSelectedTests');
          // },

          enterState: function () {
            var target = TestRunner.targetController.get('content'),
              tests = target.get('tests'),
              name;

            if (tests.get('length') === 0) {
              TestRunner.set('currentScene', 'noTests');
            } else {
              TestRunner.set('currentScene', 'testsMaster');
            }

            // Update the window title and location
            name = target.get('urlName');
            this.set('location', name);
            document.title = "_Window Title".loc(target.get('displayName'));
          }

        }),

        // allSelectedTests: SC.State.extend({

        //   representRoute: ':target/all',

        //   runTests: function () {
        //     TestRunner.testController.notifyPropertyChange('uncachedUrl');
        //   },

        //   /**
        //     Invoked when you click "back"
        //   */
        //   back: function () {
        //     TestRunner.testsController.selectObject(null);
        //     this.gotoState('noSelectedTest');
        //   },

        //   enterState: function () {
        //     var target = TestRunner.targetController.get('content'),
        //       test = TestRunner.testController.get('content'),
        //       name,
        //       filename;

        //     TestRunner.set('currentScene', 'testsDetail');

        //     // Update the window title and location
        //     name = target.get('urlName');
        //     filename = test.get('filename');
        //     document.title = "_Window Test Title".loc(target.get('displayName'), filename);

        //     this.set('location', name + '/' + filename);
        //   },

        //   enterStateByRoute: function (context) {
        //     var name = context.params.target,
        //       target,
        //       test, tests;

        //     // Select the proper target.
        //     target = TestRunner.targetsController.findProperty('name', '/' + name.replace(/-/g, '/'));
        //     TestRunner.targetsController.selectObject(target);
        //     tests = target.get('tests');
        //     TestRunner.testsController.selectObjects(tests);

        //     TestRunner.set('currentScene', 'testsDetail');

        //     // Update the window title.
        //     document.title = "_Window Test Title".loc(target.get('displayName'), '_All'.loc());
        //   }

        // }),

        selectedTest: SC.State.extend({

          representRoute: ':target/*filename',

          runTests: function () {
            TestRunner.testController.notifyPropertyChange('uncachedUrl');
          },

          /**
            Invoked when you click "back"
          */
          back: function () {
            TestRunner.testsController.selectObject(null);
            this.gotoState('noSelectedTest');
          },

          enterState: function () {
            var target = TestRunner.targetController.get('content'),
              test = TestRunner.testController.get('content'),
              name,
              filename;

            TestRunner.set('currentScene', 'testsDetail');

            // Update the window title and location
            name = target.get('urlName');
            filename = test.get('filename');
            document.title = "_Window Test Title".loc(target.get('displayName'), filename);

            this.set('location', name + '/' + filename);
          },

          enterStateByRoute: function (context) {
            var name = context.params.target,
              filename = context.params.filename,
              target,
              test, tests;

            // Select the proper target.
            target = TestRunner.targetsController.findProperty('name', '/' + name.replace(/-/g, '/'));
            TestRunner.targetsController.selectObject(target);
            tests = target.get('tests');
            test = tests.findProperty('filename', filename);
            TestRunner.testsController.selectObject(test);

            TestRunner.set('currentScene', 'testsDetail');

            // Update the window title.
            document.title = "_Window Test Title".loc(target.get('displayName'), filename);
          }

        })

      })

    })

  })

});
