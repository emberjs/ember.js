SproutCore Experimental Framework
=================================
 
The SproutCore Experimental framework contains code that is
not ready to be included in the core framework and is **actively** being
worked on. This code is being improved with the expectation that
eventually the code that lives in this parent framework will become
a part of the core framework. If you are interested in using a framework
that is experimental, can you do the following in your Buildfile:

    config :your_app, :required => [:sproutcore, :'sproutcore/experimental/example']

which will include the experimental framework and whatever modifications
it makes to the core framework in your project.


### Note

Experimental frameworks may not be kept up to date with the master core
code, and by nature will be unstable and less tested than the core code.
We will try our best to maintain experimental code and ensure
that code that will not make it into the core framework is pruned, but
there are no guarantees.
