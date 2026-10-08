# T17 fake-stub survey (B1)

Ruling (Q6): Glimmer was written in another repo, so Ember and Glimmer each test fake stubs of
the other. Everything remaining is flagged for elimination. Glimmer tests now run in Ember's
page (one `index.html`, Ember's global context), so the real thing is available to both.

## Checklist
- [ ] 1. Glimmer harness emulating Ember
- [ ] 2. Ember tests emulating Glimmer / bypassing it
- [ ] 3. Duplicated suites
- [ ] 4. Summary table and sequence
