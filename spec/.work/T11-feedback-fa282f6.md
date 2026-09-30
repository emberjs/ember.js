# T11: feedback from fa282f6d78

Resume from the first unticked item.

- [x] Q1 (§08-14): ruling, keep the silent `{{foo}}` in loose mode (loose mode stays stable while
      it is phased out; ember-template-lint `no-curly-component-invocation` and `no-implicit-this`
      flag it). Update §08-14 Q1, §0.7.1 item 6, §03-5.3 if it discusses it, STATUS decisions.
- [x] Q2 (§08-14): branch against origin/main with a test that passes before 4b5d79a6d7d1b
      (route manager merge) and fails after: `{{outlet}}` inside a component rendered by a route
      template. Verify on 4b5d79a6d7d1b^1 (pass) and on origin/main (fail). Record in §08-14 Q2
      and STATUS "Upstream fix branches".
- [x] Q7 (§08-14): cleanup branch for the `action` leftovers (syntax keyword, strict-mode
      keyword, transform-action-syntax). Record in §08-14 Q7 and STATUS.
