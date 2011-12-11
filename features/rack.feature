Feature: Interaction with Rack
  Scenario: Run "dist" task
    When I run rake "dist"
    Then I should have "amber.js" file in "dist" directory
     And I should have "amber.min.js" file in "dist" directory

  Scenario: Run "clean" task
    Given existed "dist" directory
      And existed "tmp" directory
     When I run rake "clean"
     Then I should not nave "dist" directory
      And I should not nave "dist" directory

  Scenario: Run "starter_kit:pull"
    When I run rake "starter_kit:pull"
    Then I should have "tmp" directory
     And I should have "tmp/starter-kit/js/libs/" directory

  Scenario: Run "starter_kit:clean"
    When I run rake "starter_kit:pull"
     And I run rake "starter_kit:clean"
    Then I should not have "sproutcore-2.0.a.3.js" file in "tmp/starter-kit/js/libs" directory
     And I should not have "sproutcore-2.0.a.3.min.js" file in "tmp/starter-kit/js/libs" directory

  Scenario: Run "starter_kit:index"
    When I run rake "starter_kit:index"
    Then I should have "sproutcore-2.0.beta.3.js" file in "tmp/starter-kit/js/libs" directory
     And I should have "sproutcore-2.0.beta.3.min.js" file in "tmp/starter-kit/js/libs" directory
     And "index.html" file should have "js/libs/sproutcore-2.0.beta.3.min.js" content

  Scenario: Run "starter_kit:build"
    When I run rake "starter_kit:build"
    Then I should have "starter-kit.2.0.beta.3.zip" file in "dist" directory
