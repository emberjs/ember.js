/*globals Test */

sc_require('controllers/statechart_controller');

Test.statechart = SC.Statechart.create({
  
  trace: YES,
  
  initialState: 'loggedOutState',
  
  delegate: Test.statechartController,
  
  loggedOutState: SC.State.design({
    
    enterState: function() {
      Test.loginPage.get('mainPane').append();
    },
    
    exitState: function() {
      Test.loginPage.get('mainPane').remove();
    },
    
    login: function() {
      Test.loginController.set('loggedIn', YES);
      var del = this.get('statechartDelegate');
      var ctx = del.get('lastRouteContext');
      if (ctx) {
        ctx.retry();
      } else {
        this.gotoState('loggedInState');
      }
    }
    
  }),
  
  loggedInState: SC.State.design({
    
    enterState: function() {
      Test.mainPage.get('mainPane').append();
    },
    
    switchToFooMode: function() {
      this.gotoState('fooState');
    },
    
    switchToBarMode: function() {
      this.gotoState('barState');
    },
    
    initialSubstate: 'fooState',
    
    fooState: SC.State.design({
      
      representRoute: 'foo',
      
      enterState: function() {
        this.set('location', 'foo');
        Test.mainController.set('mode', Test.MODE_FOO);
      }
      
    }),
    
    barState: SC.State.design({

      representRoute: 'bar/:id',
      
      enterState: function() {
        this.set('location', 'bar/4?blah=xml');
        Test.mainController.set('mode', Test.MODE_BAR);
      }
      
    })
    
  })
  
});