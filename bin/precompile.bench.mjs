/**
 * Mitata benchmark for `@glimmer/syntax` parse (`preprocess`), normalize
 * (ASTv1 → ASTv2 — where the loc-conversion hot path lives), and full
 * `precompile()` (via `ember-template-compiler`, which inlines
 * `@glimmer/compiler`).
 *
 * Run:
 *   pnpm build     # produces the dist artifacts this bench imports
 *   pnpm bench:precompile
 *
 * To compare branches, check out each branch, build, run the bench, and diff
 * the ms/iter numbers.
 *
 * Sizes:
 *   small  — ~1.5k chars (route-template fragment)
 *   medium — small × 3   (~4.5k chars)
 *   large  — small × 22  (~33k chars, scale of the largest real route
 *                         templates, e.g. Discourse's admin-user/index.gjs)
 */

import { bench, do_not_optimize as doNotOptimize, run } from 'mitata';

/* eslint n/no-missing-import: "off" -- dist/ is built by `pnpm build`; may not exist at lint time */
import { normalize, preprocess, src } from '../packages/@glimmer/syntax/dist/es/index.js';
import { precompile } from '../dist/prod/packages/ember-template-compiler/index.js';

const SMALL = `<div class='user-profile {{if this.isPremium "premium"}}'>
  <header class='profile-header'>
    <img src={{this.avatarUrl}} alt={{this.username}} class='avatar' />
    <h2>{{this.displayName}}</h2>
    <p class='bio'>{{this.bio}}</p>
    {{#if this.isOwnProfile}}
      <button {{on 'click' this.editProfile}}>Edit Profile</button>
    {{/if}}
  </header>
  <nav class='profile-tabs'>
    {{#each this.tabs as |tab|}}
      <button
        class='tab {{if (eq tab.id this.activeTab) "active"}}'
        {{on 'click' (fn this.setTab tab.id)}}
      >
        {{tab.label}}{{#if tab.count}}<span class='count'>{{tab.count}}</span>{{/if}}
      </button>
    {{/each}}
  </nav>
  <section class='profile-content'>
    {{#if (eq this.activeTab 'posts')}}
      {{#each this.posts as |post|}}
        <article class='post-card'>
          <h3>{{post.title}}</h3><p>{{post.excerpt}}</p>
          <footer><time>{{post.createdAt}}</time><span>{{post.views}} views</span></footer>
        </article>
      {{else}}
        <p class='empty-state'>No posts yet.</p>
      {{/each}}
    {{else if (eq this.activeTab 'followers')}}
      {{#each this.followers as |follower|}}
        <div class='follower-card'>
          <img src={{follower.avatar}} alt={{follower.name}} />
          <span>{{follower.name}}</span>
          <button {{on 'click' (fn this.followUser follower.id)}}>
            {{if follower.isFollowing 'Unfollow' 'Follow'}}
          </button>
        </div>
      {{/each}}
    {{/if}}
  </section>
</div>
`;

const FIXTURES = {
  small: SMALL,
  medium: SMALL.repeat(3),
  large: SMALL.repeat(22),
};

for (const [size, source] of Object.entries(FIXTURES)) {
  const chars = source.length;
  bench(`parse      ${size} (${chars}c)`, () => doNotOptimize(preprocess(source)));
  bench(`normalize  ${size} (${chars}c)`, () => doNotOptimize(normalize(new src.Source(source))));
  bench(`precompile ${size} (${chars}c)`, () => doNotOptimize(precompile(source)));
}

await run({ throw: true });
