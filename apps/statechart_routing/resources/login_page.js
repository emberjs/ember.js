/*globals Test */

Test.loginPage = SC.Page.create({

  mainPane: SC.MainPane.design({

    childViews: 'mainView'.w(),

    mainView: SC.View.design({

      childViews: 'headerView usernameView passwordView footerView'.w(),

      layout: { centerX: 0, centerY: 0, width: 300, height: 150 },

      headerView: SC.LabelView.design({
        classNames: ['header-label'],
        layout: { top: 0, left: 0, right: 0, height: 30 },
        value: 'Login'
      }),

      usernameView: SC.View.design({
        childViews: 'labelView textfieldView'.w(),
        layout: { top: 30, left: 0, right: 0, height: 30 },
        labelView: SC.LabelView.design({
          layout: { centerX: 0, left: 0, height: 24, width: 80 },
          value: "Username:"
        }),
        textfieldView: SC.TextFieldView.design({
          layout: { centerX: 0, left: 90, right: 0, height: 24 },
          valueBinding: 'Test.loginController.username'
        })
      }),

      passwordView: SC.View.design({
        childViews: 'labelView textfieldView'.w(),
        layout: { top: 60, left: 0, right: 0, height: 30 },
        labelView: SC.LabelView.design({
          layout: { centerX: 0, left: 0, height: 24, width: 80 },
          value: "Password:"
        }),
        textfieldView: SC.TextFieldView.design({
          layout: { centerX: 0, left: 90, right: 0, height: 24 },
          valueBinding: 'Test.loginController.password'
        })
      }),

      footerView: SC.View.design({
        childViews: 'buttonView'.w(),
        layout: { top: 120, left: 0, right: 0, bottom: 0 },
        buttonView: SC.ButtonView.design({
          layout: { height: 24, width: 80, right: 0, bottom: 0 },
          title: 'Login',
          action: 'login'
        })
      })

    })

  })

});
