#!/usr/bin/env bash
# Only fast-forward to an approved, current main commit; never force push.
set -euo pipefail
: "${PASSED_SHA:?Set PASSED_SHA to the successfully tested commit}"
if ! [[ "$PASSED_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid tested commit SHA" >&2
  exit 1
fi
git fetch origin main
ACTUAL_MAIN="$(git rev-parse origin/main)"
if [ "$ACTUAL_MAIN" != "$PASSED_SHA" ]; then
  echo "A newer main commit exists. Skip stale successful run."
  exit 0
fi
if git ls-remote --exit-code --heads origin production >/dev/null; then
  git fetch origin production
  if ! git merge-base --is-ancestor origin/production "$PASSED_SHA"; then
    echo "Production branch is not an ancestor of the tested commit. No force push." >&2
    exit 1
  fi
fi
git push origin "$PASSED_SHA:refs/heads/production"
echo "Promoted tested $PASSED_SHA to production branch."
