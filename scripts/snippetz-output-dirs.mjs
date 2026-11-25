// @scalar/snippetz writes generated files into Scalar's .NET and Java integrations and its docs after
// every build, and fails when the folders are missing. Those folders are pruned from this repository
// (scripts/prune-upstream.sh), so this creates empty, git-ignored targets for it. Runs on pnpm install.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

for (const dir of [
  'integrations/dotnet/shared/src/Scalar.Shared/Enums',
  'integrations/dotnet/shared/src/Scalar.Shared/Mapper',
  'integrations/java/scalar-core/src/main/java/com/scalar/maven/core/enums',
  'documentation',
]) {
  mkdirSync(join(root, dir), { recursive: true })
}

// The docs generator replaces the text between these two markers, so both must exist
const configurationDoc = join(root, 'documentation/configuration.md')
if (!existsSync(configurationDoc)) {
  writeFileSync(configurationDoc, '<!-- AUTO-GENERATED:CLIENTS START -->\n<!-- AUTO-GENERATED:CLIENTS END -->\n')
}
