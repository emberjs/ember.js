// deprecated
// Main Ace Theme
SC.LegacyTheme = SC.BaseTheme.create({
  name: 'legacy',
  description: "The old SproutCore Ace theme. Deprecated. Included for backwards-compatibility."
});

SC.Theme.addTheme(SC.LegacyTheme);

// for backwards-compatibility with apps that do not set their
// own default theme:
SC.defaultTheme = 'legacy';

