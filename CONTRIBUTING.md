# Questions

This is the issue tracker for Ember.js. The Ember.js community uses this site
to collect and track bugs and discussions of new features. If you are having
difficulties using Ember.js or have a question about usage please ask a
question on StackOverflow: http://stackoverflow.com/questions/ask and tag
your question with `ember.js`.

The Ember.js community is very active on StackOverflow and most questions
receive attention the same day they're posted:
http://stackoverflow.com/questions/tagged/ember.js

# Issues

Think you've found a bug or have a new feature to suggest? Let us know!

## Reporting a Bug
1. Update to the most recent master release if possible. We may have already
fixed your bug.

2. Search for similar issues. It's possible somebody has encountered
this bug already.

3. Provide JSFiddle or JSBin demo that specifically shows the problem. This
demo should be fully operational with the exception of the bug you want to
demonstrate. The more pared down, the better. 
Preconfigured starting points: [JSFiddle](http://jsfiddle.net/mnfmv/) | [JSBin](http://jsbin.com/adedag/173/edit)
Issues with fiddles are prioritized.

4. Your issue will be verified. The provided fiddle will be tested for
correctness. The Ember team will work with you until your issue can
be verified.

5. Keep up to date with feedback from the Ember team on your ticket. Your
ticket may be closed if it becomes stale.

6. If possible, submit a Pull Request with a failing test. Better yet, take
a stab at fixing the bug yourself if you can!

The more information you provide, the easier it is for us to validate that
there is a bug and the faster we'll be able to take action.

## Requesting a Feature

1. Search Issues for similar feature requests. It's possible somebody has
already asked for this feature or provided a pull request that we're still
discussing.

2. Provide a clear and detailed explanation of the feature you want and why
it's important to add. Keep in mind that we want features that will be useful
to the majority of our users and not just a small subset. If you're just
targeting a minority of users, consider writing an add-on library for Ember.

3. If the feature is complex, consider writing some initial documentation for
it. If we do end up accepting the feature it will need to be documented and
this will also help us to understand it better ourselves.

4. Attempt a Pull Request. If you're at all able, start writing some code. We
always have more work to do than time to do it. If you can write some code
then that will speed the process along.

# Building Ember.js

The stack needed to build emberjs can be quite complex to setup for new developers. A VagrantFile is here to ease things for newcomers.
Using Vagrant to buid latest version of Ember.js is quite simple. Just follow nexts 4 steps:

1. Install Virtual Box - [Download](https://www.virtualbox.org/wiki/Downloads)

2. Install Vagrant - [Download](http://downloads.vagrantup.com/)

3. Retrieve chef cookbooks
~~~
git submodule init
git submodule update
~~~
4. Lauch your vagrant virtual machine
~~~
vagrant up
vagrant ssh
~~~
5. Use it!
~~~
cd /vagrant
bundle install
rake dist
rake test
...
~~~

# Pull Requests

We love pull requests. Here's a quick guide:

1. Fork the repo.

2. Run the tests. We only take pull requests with passing tests, and it's great
to know that you have a clean slate: `bundle && rake test[all]`. (To see tests
in the browser, run `rackup` and open `http://localhost:9292/`.)

3. Add a test for your change. Only refactoring and documentation changes
require no new tests. If you are adding functionality or fixing a bug, we need
a test!

4. Make the test pass.

5. Commit your changes. If your pull request fixes an issue specify it in the commit message.
Here's an example: `git commit -m "Close #52 - Fix controller and viewbindings"`

6. Push to your fork and submit a pull request. Please provide us with some
explanation of why you made the changes you made. For new features make sure to
explain a standard use case to us.

We try to be quick about responding to tickets but sometimes we get a bit
backlogged. If the response is slow, try to find someone on IRC (#emberjs) to
give the ticket a review.

Some things that will increase the chance that your pull request is accepted,
taken straight from the Ruby on Rails guide:

* Use Ember idioms and helpers
* Include tests that fail without your code, and pass with it
* Update the documentation, the surrounding one, examples elsewhere, guides,
  whatever is affected by your contribution

Syntax:

* Two spaces, no tabs.
* No trailing whitespace. Blank lines should not have any space.
* a = b and not a=b.
* Follow the conventions you see used in the source already.

Inline Documentation Guidelines:

All inline documentation is written using YUIDoc. Follow these rules when
updating or writing new documentation:

1. All code blocks must be fenced
2. All code blocks must have a language declared
3. All code blocks must be valid code for syntax highlighting
4. All examples in code blocks must be aligned
5. Use two spaces between the code and the example: `foo();  // result`
6. All references to code words must be enclosed in backticks
7. Prefer a single space between sentences
8. Reference Ember.js as Ember.
9. Wrap long markdown blocks > 80 characters
10. Don't include blank lines after `@param` defintions

Code words are:

* `thisPropertyName`
* `Global.Class.attribute`
* `thisFunction()`
* `Global.CONSTANT_NAME`
* `true`, `false`, `null`, `undefined` (when refering to programming values)
* references to other properties/methods

And in case we didn't emphasize it enough: we love tests!

NOTE: Partially copied from https://raw.github.com/thoughtbot/factory_girl_rails/master/CONTRIBUTING.md
