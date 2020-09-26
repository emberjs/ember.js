#!/usr/bin/env node

/* eslint-disable no-console, node/shebang */

'use strict';

/*
 * This script generates the template a changelog by comparing a current version
 * with master. Run this, copy what's logged into the `CHANGELOG.md` and update
 * the top section based on the changes listed in "Community Contributions"
 *
 * Usage:
 *
 * bin/changelog.js
 */

const RSVP = require('rsvp');
const GitHubApi = require('github');
const execSync = require('child_process').execSync;

const github = new GitHubApi({ version: '3.0.0' });
const compareCommits = RSVP.denodeify(github.repos.compareCommits);

const currentVersion = process.env.PRIOR_VERSION;
const head = process.env.HEAD || execSync('git rev-parse HEAD', { encoding: 'UTF-8' });

compareCommits({
  user: 'emberjs',
  repo: 'ember.js',
  base: currentVersion,
  head: head,
})
  .then(processPages)
  .then(console.log)
  .catch((err) => console.error(err));

function getCommitMessage(commitInfo) {
  let message = commitInfo.commit.message;

  if (message.indexOf('cherry picked from commit') > -1) {
    let cherryPickRegex = /cherry picked from commit ([a-z0-9]+)/;
    let originalCommit = cherryPickRegex.exec(message)[1];

    try {
      // command from http://stackoverflow.com/questions/8475448/find-merge-commit-which-include-a-specific-commit
      message = execSync(
        'commit=$((git rev-list ' +
          originalCommit +
          '..origin/master --ancestry-path | cat -n; git rev-list ' +
          originalCommit +
          '..origin/master --first-parent | cat -n) | sort -k2 | uniq -f1 -d | sort -n | tail -1 | cut -f2) && git show --format="%s\n\n%b" $commit',
        { encoding: 'utf8' }
      );
    } catch (e) {
      // ignored
    }
  }

  return message;
}

function excludeDependabot(commitInfo) {
  let author = commitInfo.author.login;
  return author !== 'dependabot-preview[bot]' && author !== 'dependabot[bot]';
}

function isMergeOrCherryPick(commitInfo) {
  if (commitInfo.parents.length == 2) return true;

  let message = commitInfo.commit.message;
  return message.indexOf('Merge pull request #') > -1 || message.indexOf('cherry picked from') > -1;
}

function comparePrNumber(a, b) {
  if (a.number < b.number) return -1;
  if (a.number > b.number) return 1;
  return 0;
}

function processPages(res) {
  let contributions = res.commits
    .filter(excludeDependabot)
    .filter(isMergeOrCherryPick)
    .map((commitInfo) => {
      let message = getCommitMessage(commitInfo);

      let mergeFromBranchRegex = /#(\d+) from (.*)\//;
      let mergeWithPrReferenceRegex = /\(#(\d+)\)$/m;
      let result = {
        sha: commitInfo.sha,
      };

      if (mergeFromBranchRegex.test(message)) {
        let match = message.match(mergeFromBranchRegex);
        let numAndAuthor = match.slice(1, 3);

        result.number = numAndAuthor[0];
        result.title = message.split('\n\n')[1];
      } else if (mergeWithPrReferenceRegex.test(message)) {
        let match = message.match(mergeWithPrReferenceRegex);
        result.number = match[1];
        result.title = message.split('\n')[0];
      } else {
        result.title = message.split('\n\n')[0];
      }

      return result;
    })
    .sort(comparePrNumber)
    .map((pr) => {
      let title = pr.title;
      let link;
      if (pr.number) {
        link =
          '[#' + pr.number + ']' + '(https://github.com/emberjs/ember.js/pull/' + pr.number + ')';
      } else {
        link =
          '[' + pr.sha.slice(0, 8) + '](https://github.com/emberjs/ember.js/commit/' + pr.sha + ')';
      }

      return '- ' + link + ' ' + title;
    })
    .join('\n');

  if (github.hasNextPage(res)) {
    return github.getNextPage(res).then((nextPage) => {
      contributions += processPages(nextPage);
    });
  } else {
    return RSVP.resolve(contributions);
  }
}
