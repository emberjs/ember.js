sc_require("theme");

// it is derived from dark, but will be available both under Ace and not.
SC.AceTheme.Popover = SC.AceTheme.Dark.subtheme("popover");
SC.AceTheme.addTheme(SC.AceTheme.Popover);

// there is a solid variety
SC.AceTheme.SolidPopover = SC.AceTheme.Popover.subtheme('solid');

// and a shortcut to the solid variety.
SC.AceTheme.addTheme(SC.AceTheme.SolidPopover.create({ name: 'solid-popover' }));

