#!/bin/sh
# Removes the parts of upstream Scalar that the docs site does not use, to keep the repo and
# `pnpm install` light. Run it after every `git merge upstream/main`: upstream keeps changing these
# folders, so a merge brings files back or stops on "deleted by us" conflicts, which this also resolves.
#
# Before adding a package here, check that @scalar-examples/web does not depend on it, directly or
# through another workspace package (dev dependencies included), or `pnpm install` fails.
# @scalar/snippetz still writes into integrations/ and documentation/ when it builds;
# scripts/snippetz-output-dirs.mjs creates those folders on install, git-ignored.
set -e
cd "$(dirname "$0")/.."

PATHS="
documentation
scalar.config.json
integrations
projects
tooling/changelog-generator
release-notes.config.ts
packages/api-client-react
packages/api-reference-react
packages/asyncapi-validator
packages/code-highlight
packages/draggable
packages/import
packages/json-schema-validator
packages/mermaid-plugin
packages/mock-server
packages/nextjs-openapi
packages/object-utils
packages/openapi-parser
packages/openapi-validator
packages/postman-to-openapi
packages/pre-post-request-scripts
packages/react-renderer
packages/release-notes
packages/server-side-rendering
packages/ts-to-openapi
packages/void-server
patches/postman-collection@5.3.1.patch
patches/README.md
.agents
.asyncapi-tool
.changeset
.claude
.devcontainer
.vscode
.zed
.dockerignore
.mcp.json
AGENTS.md
CHANGELOG.md
CITATION.cff
CODE_OF_CONDUCT.md
CODEOWNERS
CONTRIBUTING.md
RELEASE.md
SECURITY.md
knip.jsonc
oss-pledge.json
"

# Every example except the docs site itself
for example in examples/*/; do
  [ "$example" = "examples/web/" ] || PATHS="$PATHS ${example%/}"
done

# shellcheck disable=SC2086
git rm -r -q --ignore-unmatch -- $PATHS
# Also drop ignored leftovers (node_modules, dist) so pnpm does not pick them up
# shellcheck disable=SC2086
rm -rf $PATHS
echo "Pruned. Next: pnpm install, then pnpm build:web."
