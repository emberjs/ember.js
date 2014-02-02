// ==========================================================================
// Project:   Test
// Copyright: @2011 My Company, Inc.
// ==========================================================================
/*globals Test */

// This is the theme that defines how your app renders.
//
// Your app is given its own theme so it is easier and less
// messy for you to override specific things just for your
// app.
//
// You don't have to create the whole theme on your own, though:
// your app's theme is based on SproutCore's Ace theme.
//
// NOTE: if you want to change the theme this one is based on, don't
// forget to change the :css_theme property in your buildfile.
Test.Theme = SC.AceTheme.create({
  name: 'test'
});

// SproutCore needs to know that your app's theme exists
SC.Theme.addTheme(Test.Theme);

// Setting it as the default theme makes every pane SproutCore
// creates default to this theme unless otherwise specified.
SC.defaultTheme = 'test';
