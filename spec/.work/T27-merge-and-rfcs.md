# T27: merge `origin/main` (base `493985e956`) and the RFC updates of 2026-10/11

Merge commit `a1c8221703` (old upstream base `a9501d5d40`, new `493985e956`, 136 commits).
If this checklist already has ticked items, continue from the first unticked one. Commit after
each item or small group (`spec(T27): …`), staging only files you changed.

## A. Citations (Sonnet)

- [x] A1. `python3 spec/tools/remap-citations.py a9501d5d40 493985e956 --apply` (about 257 shifts). Commit.
- [x] A2. Fix the 12 FLAG lines by hand (listed by the dry run; re-run without `--apply` against
      the old base to see them again if needed: they are in 05:945, 05:946, 05:1225, 05:1226,
      06:78, 07:188, 07:1585, 07:1589, 07:1805, 08:955, 08:1230, 08:1457 at the time of the
      dry run). For each, open the new file and re-derive the span from the construct the prose
      names. Note any whose content changed meaning (not just moved) under "Notes for B" below.
- [ ] A3. Moved test files (`git diff -M --name-status a9501d5d40 493985e956 -- packages | grep ^R`):
      seven files moved into `tests/integration/components/classic/`. Rewrite every spec
      citation to their old paths (including bare-filename citations) to the new path, and
      re-check the spans by matching source lines. Deleted files:
      `runtime/tests/mixins/mutable_enumerable_test.js`, `utils/lib/internal-mixin-create.ts`,
      `enumerable/tests/enumerable_test.js`, `@glimmer/component/src/-private/base-component-manager.ts`
      (inlined into `ember-component-manager.ts`). Re-point or note each citation to them.
      Also the mixin files split into `*-internal.ts` (e.g. `-proxy.ts` → `-proxy-internal.ts`,
      `observable.ts`, `mixin.ts`, `array/index.ts`, `controller/index.ts`,
      `target_action_support.ts`, `action_support.ts`, `registry_proxy.ts`, `container_proxy.ts`,
      `action_handler.ts`): citations into those files may now point at the wrong file; re-derive.
- [ ] A4. `python3 spec/tools/check-citations.py` clean; `python3 spec/tools/xref.py` clean.
      Hand-check bare continuation spans (`` `573-595` `` with no file name) near changed citations.

### Notes for B

(Sonnet: list here anything where the cited code's behavior changed.)

- 07-reactivity:188, `tracking.ts:396-398`: the snapshot is now taken after `endCacheFrame(tag)` (reuses the previous tag when the same tags were consumed in the same order, #21664), not `endTrackFrame()`; prose still says `endTrackFrame()`.
- 05-runtime-semantics:1225, `renderer.ts:76-91`: `DynamicScope.outletState` is now `Reference<OutletArgProvider | null | undefined>` (was `OutletState`); assertions unchanged.
- 05-runtime-semantics:1226, `with-dynamic-var-test.js:4-41`: the two "does not allow ... other than outletState" assertion tests now run under `ClassicRenderingTestCase` ("(classic root)"), since non-classic roots have no such dynamic scope (#21775).
- 08-ember-integration:1457, `root-outlet.ts:249-288`: `OutletArgProvider` gained `scopeOutletRef` (a classic level exposes its child outlet to `{{outlet}}` in components below via `dynamicScope`, non-classic levels expose `NON_CLASSIC_SCOPE`), and `outletHelper` compiles `{{outlet}}` to `{{component (-outlet @outlet)}}`; asserts under a non-classic level (B2).
- 07-reactivity:1585/1589, `-proxy-internal.ts`: the public `ProxyMixin` is now a deprecated wrapper (`deprecate-proxy-mixin`) around `InternalProxyMixin`; behavior of `unknownProperty` unchanged.
- 08-ember-integration:1230, `action_support-internal.ts:18-48`: `send` is unchanged; the public `ActionSupport` is now a deprecated wrapper over the internal mixin.
- 05-runtime-semantics:945/946 (each-test.js), 07:1805 (tracked-test.js): the `A()`-based tests are now skipped when `DEPRECATE_EMBER_ARRAY_A` is removed and expect its deprecation (#21687/#21588); the `each` semantics are unchanged.

## B. Prose (Opus)

- [ ] B1. Numeric character references: simple-html-tokenizer 1.0 (#115 merged 2026-10-15) is on
      main via emberjs/ember.js#21730 (`f46ea015cb`); #21728 closed. Verify the built behavior,
      then drop **[Out of spec]** from §02-6.3, §00-0.5.1 row, §02-11 item 6, §00-0.7.1 item 4.
- [ ] B2. `{{outlet}}` (#21762, `2661751e2f`): renders inside components again; allowed in
      strict mode (`-outlet` in `STRICT_MODE_KEYWORDS`); compiled to `{{component (-outlet @outlet)}}`;
      dynamic outlet only below classic routes. Update §03-7, §03 keyword tables, §08-1.4(10),
      §08 outlet sections and §08-14 Q2/Q9/Q14, §00-0.7, §09 table. #21640 is superseded.
- [ ] B3. Legacy Handlebars tests landed (#21723, `d125e25fe2`): cite them for the four
      **[Deprecated]** features in §02; RFC 1249 accepted (rfcs#1249 merged 2026-10-26) with ids
      `template-ampersand-mustache`, `template-caret-else`, `template-inverse-block-with-else`,
      `template-raw-block`, `until: 8.0.0`. Guides: ember-learn/deprecation-app#1442 (open).
- [ ] B4. RFC 1253 (`mut`, `deprecate-mut-helper`, until 8.0.0) and RFC 1248 (`readonly`,
      `deprecate-readonly-helper`, until next LTS) accepted 2026-11-02; not yet implemented.
      Mark **[Deprecated]** in §08-2.11, §08-2.12 and the keyword lists (§03, §08-1, §0.1/§0.5).
- [ ] B5. RFC 1216 (classic `@ember/component`, id `ember-component`, until 8.0.0), RFC 1234
      (`EmberObject`, opt-in, until 9.0.0), RFC 1115 (observers, until 8.0.0) accepted: note in
      the [Legacy] areas of §08 (classic components) and §07-3.6 (computed/observers).
- [ ] B6. Other behavior changes on main: #21778 (destroyable hierarchy in base renderer),
      #21779 (owner releases a root whose first render threw), #21664 (reuse the combined tag of a
      cache, `validator/lib/tracking.ts`), `each-in.ts`, #21771 (`LinkTo` model properties),
      #21687/#21588 deprecations (array macros, `A()`, mixins), #21775 + `f758602aeb` (tests
      render through a Glimmer root component without the classic dynamic scope; §09 harness).
      Read each diff and update the owning prose.
- [ ] B7. STATUS: merge base, upstream-branch table, T21/T26 rows, T27 row, date.
