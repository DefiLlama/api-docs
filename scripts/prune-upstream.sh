#!/bin/sh
# Removes the parts of upstream Scalar that the docs site does not use, to keep the repo and
# `pnpm install` light. Run it after every `git merge upstream/main`: upstream keeps changing these
# folders, so a merge brings files back or stops on "deleted by us" conflicts, which this also resolves.
#
# Before adding a package here, check that @scalar-examples/web does not depend on it, directly or
# through another workspace package, or the Cloudflare build fails.
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
"

# @scalar/snippetz regenerates these after every build (its postbuild step), and fails if they are missing
KEEP="
documentation/configuration.md
integrations/dotnet/shared/src/Scalar.Shared/Enums/ScalarTarget.Generated.cs
integrations/dotnet/shared/src/Scalar.Shared/Enums/ScalarClient.Generated.cs
integrations/dotnet/shared/src/Scalar.Shared/Mapper/ScalarOptionsMapper.Generated.cs
integrations/java/scalar-core/src/main/java/com/scalar/maven/core/enums/ScalarTarget.java
integrations/java/scalar-core/src/main/java/com/scalar/maven/core/enums/ScalarClient.java
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
# Put back the files snippetz writes to, at upstream's latest version
# shellcheck disable=SC2086
git checkout upstream/main -- $KEEP
echo "Pruned. Next: pnpm install, then pnpm build:web."
