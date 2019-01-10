We now have a component executing with some external, mutable state. But what if we want to introduce external computation into the mix?

In Glimmer, that's the job of "helpers". Helpers are functions that take references and return references.
