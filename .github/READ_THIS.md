# READ THIS

_not named README because GitHub will display a README.md from this directory at the root_

## Workflows

## Guidelines

### Avoid caches

We first disabled caches for publish due to the risk of cache poisoning.

Later we found caches were allowing CI to pass when updating actions. They would
later fail when the caches were cycled. To avoid this, and after testing to ensure
the slowdown was acceptable, we have disabled all caching on actions/setup-node
and pnpm/action-setup.

### Actions must be pinned to shas

Actions are pinned to shas and this is a requirement of the GitHub organization. 
This prevents the risk of a malicious action being used -- as releases can be reset
to different shas. 

To update actions to shas run `pnpm actions-up`.

### Run Zizmor

The workflow-lint.yml workflow runs [Zizmor](https://github.com/zizmorcore/zizmor)
on all workflows and actions to statically check for insecure patterns.
