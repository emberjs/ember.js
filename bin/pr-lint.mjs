import fs from 'node:fs';
import path from 'node:path';

const EVENT_PATH = process.env.GITHUB_EVENT_PATH;
const EVENT_NAME = process.env.GITHUB_EVENT_NAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const COMMITS_PATH = process.env.PR_LINT_COMMITS_PATH;
const COMMITS_JSON = process.env.PR_LINT_COMMITS_JSON;

if (!EVENT_PATH || !fs.existsSync(EVENT_PATH)) {
  console.error('Missing GITHUB_EVENT_PATH; cannot read GitHub event payload.');
  process.exit(1);
}

if (EVENT_NAME !== 'pull_request') {
  console.log(`Skipping PR lint: unsupported event ${EVENT_NAME ?? 'unknown'}.`);
  process.exit(0);
}

const event = JSON.parse(fs.readFileSync(EVENT_PATH, 'utf8'));
const pullRequest = event.pull_request;

if (!pullRequest) {
  console.error('Missing pull_request in event payload.');
  process.exit(1);
}

const { title, number, base, head } = pullRequest;
const repo = base?.repo;
const owner = repo?.owner?.login;
const repoName = repo?.name;

if (!owner || !repoName || !number) {
  console.error('Missing repository or PR info in event payload.');
  process.exit(1);
}

const errors = [];

const allowedDocChannels = new Set(['canary', 'beta', 'release']);
const bugfixChannelPattern = /^(beta|release(-\d+(?:-\d+)*)?)$/;
const featureNamePattern = /^[a-zA-Z0-9._-]+$/;

function parseTagLine(line, sourceLabel) {
  if (!line.startsWith('[')) {
    return;
  }

  const closingIndex = line.indexOf(']');
  if (closingIndex === -1) {
    errors.push(`${sourceLabel}: missing closing "]" for tag.`);
    return;
  }

  const tagContent = line.slice(1, closingIndex).trim();
  if (!tagContent) {
    errors.push(`${sourceLabel}: empty tag "[]" is not allowed.`);
    return;
  }

  const parts = tagContent.split(/\s+/);
  const tag = parts[0];

  switch (tag) {
    case 'BUGFIX': {
      if (parts.length !== 2 || !bugfixChannelPattern.test(parts[1])) {
        errors.push(
          `${sourceLabel}: invalid BUGFIX tag. Use "[BUGFIX beta]", "[BUGFIX release]", or "[BUGFIX release-<x-y>]".`
        );
      }
      return;
    }
    case 'CLEANUP': {
      if (parts.length !== 1) {
        errors.push(`${sourceLabel}: invalid CLEANUP tag. Use "[CLEANUP]" only.`);
      }
      return;
    }
    case 'FEATURE': {
      if (parts.length !== 2 || !featureNamePattern.test(parts[1])) {
        errors.push(
          `${sourceLabel}: invalid FEATURE tag. Use "[FEATURE <flag-name>]" (letters, numbers, dot, underscore, dash).`
        );
      }
      return;
    }
    case 'DOC': {
      if (parts.length !== 2 || !allowedDocChannels.has(parts[1])) {
        errors.push(
          `${sourceLabel}: invalid DOC tag. Use "[DOC canary]", "[DOC beta]", or "[DOC release]".`
        );
      }
      return;
    }
    case 'SECURITY': {
      if (parts.length !== 2) {
        errors.push(`${sourceLabel}: invalid SECURITY tag. Use "[SECURITY <cve>]".`);
      }
      return;
    }
    default: {
      errors.push(
        `${sourceLabel}: unknown tag "${tag}". Allowed tags: BUGFIX, CLEANUP, FEATURE, DOC, SECURITY.`
      );
    }
  }
}

parseTagLine(title.trim(), 'PR title');

function loadCommitsFromEnv() {
  if (COMMITS_JSON) {
    try {
      const parsed = JSON.parse(COMMITS_JSON);
      if (!Array.isArray(parsed)) {
        errors.push('PR_LINT_COMMITS_JSON must be a JSON array.');
        return null;
      }
      return parsed;
    } catch (error) {
      errors.push(`Failed to parse PR_LINT_COMMITS_JSON: ${error?.message ?? error}`);
      return null;
    }
  }

  if (COMMITS_PATH) {
    const resolved = path.resolve(process.cwd(), COMMITS_PATH);
    if (!fs.existsSync(resolved)) {
      errors.push(`PR_LINT_COMMITS_PATH does not exist: ${resolved}`);
      return null;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      if (!Array.isArray(parsed)) {
        errors.push('PR_LINT_COMMITS_PATH must contain a JSON array.');
        return null;
      }
      return parsed;
    } catch (error) {
      errors.push(`Failed to parse PR_LINT_COMMITS_PATH: ${error?.message ?? error}`);
      return null;
    }
  }

  return null;
}

async function fetchAllCommits() {
  if (!GITHUB_TOKEN) {
    throw new Error('Missing GITHUB_TOKEN environment variable.');
  }

  const commits = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = new URL(
      `https://api.github.com/repos/${owner}/${repoName}/pulls/${number}/commits`
    );
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('page', String(page));

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ember-pr-lint',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PR commits: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      break;
    }

    commits.push(...data);
    if (data.length < perPage) {
      break;
    }

    page += 1;
  }

  return commits;
}

try {
  const commitsFromEnv = loadCommitsFromEnv();
  const commits =
    commitsFromEnv ?? (COMMITS_PATH || COMMITS_JSON ? [] : await fetchAllCommits());
  for (const commit of commits) {
    const sha = commit?.sha?.slice(0, 8) ?? 'unknown';
    const message = commit?.commit?.message ?? '';
    const subject = message.split(/\r?\n/)[0].trim();
    if (!subject) {
      errors.push(`Commit ${sha}: missing commit subject.`);
      continue;
    }
    parseTagLine(subject, `Commit ${sha}`);
  }
} catch (error) {
  errors.push(`Failed to load PR commits: ${error?.message ?? error}`);
}

if (errors.length > 0) {
  console.error('PR lint failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('PR lint passed.');