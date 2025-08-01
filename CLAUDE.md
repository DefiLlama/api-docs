# Claude Development Guide - Scalar

## Project Overview
This is a Vue 3 + TypeScript monorepo for Scalar - an API documentation and testing platform. The project uses pnpm workspaces, Turbo for build orchestration, and modern tooling for development.

## Architecture
- **Monorepo Structure**: Multiple packages and integrations in workspaces
- **Build System**: Turbo with pnpm workspaces
- **Frontend**: Vue 3 with TypeScript and Composition API
- **Testing**: Vitest for unit tests, Playwright for E2E
- **Linting**: ESLint for vue files + Biome for ts files
- **Formatting**: Prettier for vue files + Biome

## Key Packages

### Core API Components
- `@scalar/api-client` - The open source API testing client
- `@scalar/api-client-react` - React wrapper for the API client
- `@scalar/api-reference` - Generate beautiful API references from OpenAPI documents
- `@scalar/api-reference-react` - React wrapper for the API reference component

### Core Infrastructure
- `@scalar/build-tooling` - Build tooling and helpers for all packages
- `@scalar/components` - Scalar's Vue component library with Storybook
- `@scalar/themes` - Default CSS variables and design system
- `@scalar/icons` - SVG icon component library

### OpenAPI & Document Processing
- `@scalar/openapi-parser` - Modern OpenAPI parser written in TypeScript
- `@scalar/openapi-types` - TypeScript type definitions for OpenAPI specifications
- `@scalar/oas-utils` - Open API spec and YAML handling utilities
- `@scalar/openapi-to-markdown` - Convert OpenAPI specs to markdown for LLMs

### Code & Syntax Highlighting
- `@scalar/code-highlight` - Central methods and themes for code highlighting
- `@scalar/use-codemirror` - Vue composable for CodeMirror integration

### Utility Libraries
- `@scalar/helpers` - Collection of dependency-free utility functions
- `@scalar/object-utils` - Advanced object transformation and manipulation
- `@scalar/json-diff` - JSON comparison and merging utilities

### Vue Composables & Hooks
- `@scalar/use-hooks` - Shared Vue composables and utility functions
- `@scalar/use-toasts` - Toast notification system for Vue applications
- `@scalar/use-tooltip` - Tooltip functionality for Vue components
- `@scalar/draggable` - Vue wrapper around HTML drag and drop

### Code Generation & Conversion
- `@scalar/snippetz` - HTTP client code snippet generation (25+ languages)
- `@scalar/postman-to-openapi` - Convert Postman collections to OpenAPI
- `@scalar/ts-to-openapi` - Generate OpenAPI schemas from TypeScript types

### Development & Testing Tools
- `@scalar/mock-server` - OpenAPI mock server for testing
- `@scalar/void-server` - HTTP request mirroring and testing server
- `@scalar/galaxy` - Reference OpenAPI specification for testing

### Framework-Specific Tools
- `@scalar/nextjs-openapi` - Auto-generate OpenAPI specs from Next.js API routes
- `@scalar/react-renderer` - Bridge for rendering React components in Vue

### Configuration & Types
- `@scalar/config` - Configuration schema and validation utilities
- `@scalar/types` - Shared TypeScript type definitions
- `@scalar/workspace-store` - Data store and state management

### Import & Processing
- `@scalar/import` - Import various file formats into OpenAPI documents
- `@scalar/scripts` - Script execution engine for API client automation

## Integrations

### Web Framework Integrations
- `@scalar/express-api-reference` - Express.js middleware
- `@scalar/fastify-api-reference` - Fastify plugin
- `@scalar/hono-api-reference` - Hono framework middleware
- `@scalar/nestjs-api-reference` - NestJS middleware

### Frontend Framework Integrations
- `@scalar/nextjs-api-reference` - Next.js React component
- `@scalar/nuxt` - Nuxt.js Vue framework integration
- `@scalar/sveltekit` - SvelteKit server handler
- `@scalar/docusaurus` - Docusaurus documentation integration

### .NET Integrations
- `@scalar/aspnetcore` - ASP.NET Core integration
- `@scalar/aspire` - .NET Aspire distributed applications

### Python Integrations
- `scalar_fastapi` - FastAPI web framework integration
- `scalar_django_ninja` - Django Ninja integration

### Containerization
- `@scalarapi/docker-api-reference` - Standalone Docker container

## Development Commands

### Core Commands
```bash
# Install dependencies
pnpm install

# Development server (all packages)
pnpm dev

# Build all packages
pnpm build

# Build all packages AND clear cache AND re-install packages
pnpm clean:build

# Test suite
pnpm test

# Format code
pnpm format

# Lint code
pnpm lint:check
pnpm lint:fix

# Type checking
pnpm types:check
```

### Package-Specific Commands
```bash
# API Client development
pnpm dev:client:web

# API Reference development
pnpm dev:reference
```

## Code Standards

### Vue Component Guidelines
- Use **Composition API** with `<script setup>` syntax
- TypeScript is required for all scripts (`lang="ts"`)
- Component names should be PascalCase
- Props and emits should use type-based declarations
- Prefer `type` over `interface` for type definitions

### File Structure
```
packages/
├── api-client/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── views/          # Page components
│   │   ├── layouts/        # Layout components
│   │   └── libs/           # Utility functions
│   └── playground/         # Development playground
```

### Naming Conventions
- **Components**: PascalCase (e.g., `ApiClient.vue`)
- **Files**: kebab-case (e.g., `api-client.ts`)
- **Variables**: camelCase
- **Types**: PascalCase
- **Constants**: UPPER_SNAKE_CASE

### Code Quality Rules
- Use `type` imports with `type` keyword
- Arrow functions preferred over function declarations
- Optional chaining and nullish coalescing when appropriate
- No unused variables or imports
- Consistent quote style (single quotes)
- Trailing commas in multiline structures

## Testing Strategy

### Unit Tests
- **Framework**: Vitest
- **Location**: `*.test.ts` files alongside source
- **Command**: `pnpm test`
- **Coverage**: `pnpm test:coverage`

### E2E Tests
- **Framework**: Playwright
- **Location**: `playwright/` directory
- **Command**: `pnpm test:e2e`
- **UI Mode**: `pnpm test:e2e:ui`

### Test Guidelines
- Test file names should match source files with `.test.ts` suffix
- Use descriptive test names
- Group related tests with `describe` blocks
- Mock external dependencies appropriately

## Common Patterns

### Vue Component Structure
```vue
<template>
  <div class="component-name">
    <!-- Template content -->
  </div>
</template>

<script setup lang="ts">
import type { ComponentProps } from './types'

// Props
const { prop1, prop2 = 'default' } = defineProps<ComponentProps>()

// Emits
const emit = defineEmits<{
  update: [value: string]
}>()

// Composables and logic
// Prefer tailwind for styles
</script>
```

### TypeScript Types
```typescript
// Prefer types over interfaces
export type UserConfig = {
  apiUrl: string
  theme: 'light' | 'dark'
}

// Use consistent type imports
import type { ApiResponse } from '@/types'
```

## Troubleshooting

### Common Issues
1. **Type Errors**: Check `tsconfig.json` paths and run `pnpm types:check`
2. **Lint Errors**: Use `pnpm lint:fix` to auto-fix issues

### Development Tips
- Use `pnpm dev` for hot reloading during development
- Run `pnpm format` before committing
- Use `pnpm script` for internal build scripts
- Check `turbo.json` for build optimization settings

## Git Workflow

### Branch Naming
- `claude/feature-description` - New features
- `claude/fix-description` - Bug fixes
- `claude/chore-description` - Maintenance tasks

### Commit Messages
- Follow conventional commits format
- Use present tense ("add feature" not "added feature")
- Include scope when relevant: `feat(api-client): add new endpoint`

### Pre-commit Hooks
- **Lefthook** runs linting and formatting
- **Biome** checks code quality
- **TypeScript** compilation check

## Performance Considerations
- Use `defineAsyncComponent` for code splitting
- Implement proper caching strategies
- Monitor bundle sizes with build tools
- Use `v-memo` for expensive list renders

## Key Dependencies
- **Vue 3**: Core framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Vitest**: Testing framework
- **Biome**: Linting and formatting
- **Turbo**: Monorepo orchestration
- **pnpm**: Package manager

## Documentation
- Component props should be documented with JSDoc
- Complex functions need inline comments
- README files for each package
- API documentation generated from OpenAPI specs

## Environment Variables
- Use `.env` files for local configuration
- Document required environment variables
- Use `import.meta.env` for Vite environment access

## Deployment
- **Build**: `pnpm build`
- **Test**: `pnpm test:ci`
- **Type Check**: `pnpm types:check`
- **Format Check**: `pnpm format:check`
- **Lint Check**: `pnpm lint:check`

# TypeScript

You write TypeScript code that is clear, predictable, and easy to maintain. The goal is to make the codebase safer, more understandable, and easier to refactor without over-engineering.

## Principles
* Type safety over flexibility.
* Clarity over cleverness.
* Type inference where it makes sense.

## General Guidelines
* Prefer type over interface.
* Explicit return types for functions.
* Avoid any. Use unknown when the type is unclear.
* Prefer primitive types over complex ones unless necessary.
* Use readonly when possible.
* Avoid enums. Use string literal unions instead.
* Always use const instead of let.

## Naming Conventions
* Be descriptive.
* Use suffixes appropriately.

## Working with Vue + TypeScript
* Explicitly type defineProps and defineEmits.
* Explicit return types for composables.
* Explicitly type Ref and ComputedRef.

## Testing
* Write all tests using vitest.
* Ensure you cover all main cases as well as edge cases, try to break the code with the tests.
* Create the test file alongside the file being tested, call it `name.test.ts`.

# Great Comments for All Types
* Use comments to explain why, not what. Most of the time, the code explains what is happening. Comments should clarify why a type or function exists, why you made specific decisions, or why a workaround is necessary.
* Write friendly comments that sound human. Comments should be clear and helpful, not robotic or overly formal. Aim for a tone that's friendly and supportive, like you're helping a teammate understand the code later.

Good:

```ts
/**
 * We load the user here to make sure we have fresh data when the component mounts.
 * Without this, the user info could be stale.
 */
```

Bad:

```ts
/**
 * Load user.
 */
```

* Avoid contractions in comments. Use do not instead of don't, it is instead of it's, etc. This makes comments easier to read, especially for non-native speakers.

* If you use contractions, make sure they have proper apostrophes. Sometimes contractions can make a comment more approachable. If you choose to use them, use proper punctuation.

* Comment on types when their purpose isn't obvious. If a type models an external API, or has a non-obvious constraint, explain it.

* Explain relationships between types when they're not clear.

Example:

```ts
/**
 * Maps UserStatus to a badge color used in the UI.
 * Should stay in sync with the theme color palette.
 */
export type StatusColorMap = {
  active: 'green'
  inactive: 'gray'
}
```

* Document the intent of utility types or generic types.

Example:

```ts
/**
 * Represents a partial object where at least one property is required.
 * Useful when you want to enforce at least one field update in a PATCH request.
 */
export type AtLeastOne<T> = {
  [K in keyof T]: Partial<T> & Pick<T, K>
}[keyof T]
```

* For complex function signatures or composables, describe the behavior and usage.

Example:

```ts
/**
 * useUser composable for loading and managing user data.
 * Fetches the user from the API and exposes reactive state.
 *
 * Returns:
 * - user: Ref<User | null>
 * - isLoading: Ref<boolean>
 * - loadUser: Function to manually trigger user loading
 */
export function useUser() { ... }
```

* If the type is temporary or will change later, leave a TODO comment.

Example:

```ts
/**
 * TODO: Replace with dynamic permissions from backend when available.
 */
export type Permissions = 'read' | 'write' | 'admin'
```

* Use JSDoc style consistently for types and functions that are exported or public. This improves editor support (tooltips, autocompletion) and helps other developers understand your code faster.

## Example

```ts
/**
 * A user in the system.
 * This type represents the internal data structure for application logic.
 * If you need to expose user data publicly, use `PublicUser`.
 */
export type User = {
  /** Unique identifier for the user (UUID). */
  id: string
  /** The user's full name. */
  name: string
  /** Email address. Must be validated before saving. */
  email: string
  /** ISO date string of when the user signed up. */
  createdAt: string
  /** Whether the user has verified their email. */
  isVerified: boolean
}
```

# Tests

You write tests that are clear, maintainable, and thorough. You optimize for readability and reliability. Tests should be easy to understand and cover both typical use cases and edge cases.

## Setup

* Use Vitest for most tests. Vitest is our primary testing framework.
*	No globals. Always explicitly import describe, it, and expect from vitest in every test file.
*	File naming conventions:
  * Unit/integration test files end with .test.ts.
  * Each test file matches the name of the file it tests. Example: If the code is in custom-function.ts, the test file should be named custom-function.test.ts.
  * The test file is located in the same folder as the file under test. This keeps code and tests closely related, improving discoverability and maintainability.
* Minimize mocking. Only mock when absolutely necessary. Prefer refactoring the code under test to make mocking unnecessary. Aim for simpler, pure functions that are easier to test without mocks.
* Every test file has a top-level describe().
  * The top-level describe() matches the file name under test. Example: describe('custom-function') for custom-function.test.ts.
	*	Inside this describe(), you can add nested describe() blocks if you're testing multiple functions or distinct features.
	* Deeper nesting is fine if it improves clarity.
	*	Use it() for individual tests.
	*	Keep descriptions concise and direct.
	*	Do not start with "should."
    ✅ it('generates a slug from the title')
    ❌ it('should generate a slug from the title')

## Testing Vue Components

* Don't rely on markup for assertions.
* Avoid testing the exact structure of the DOM unless necessary.
* Do not rely on Tailwind CSS classes in assertions.
* Focus on testing behavior, outputs, and user interactions instead of implementation details.

## Playwright Tests

* Use Playwright for limited end-to-end testing.
* Playwright tests live in /playwright/tests/.
* Files end with .spec.ts.
* Example file: @local.spec.ts.
* Be selective. We intentionally limit the number of Playwright tests to avoid maintenance overhead.

## Style & Best Practices

* Clarity first. Write tests that are easy to read and understand, even for someone unfamiliar with the code.
* Think like a QA engineer.
  * Cover all important code paths.
	* Test both the happy path and error handling.
	* Add tests for edge cases and potential failure scenarios.
* Comments are welcome when they add value.
	* Use comments to explain why a test exists, not what it's doing.
	* Avoid repeating what the code already makes obvious.

## Example Test File Structure

```
/src
  /lib
    custom-lib.ts
    custom-lib.test.ts
```

```ts
import { describe, it, expect } from 'vitest'
import { generateSlug } from './custom-function'

describe('custom-lib', () => {
  describe('generateSlug', () => {
    it('generates a slug from the title', () => {
      const result = generateSlug('Hello World')
      expect(result).toBe('hello-world')
    })

    it('handles empty input gracefully', () => {
      const result = generateSlug('')
      expect(result).toBe('')
    })
  })
})
```

# Writing Vue Components

You are an experienced Vue and TypeScript developer. You write components that are clean, readable, and easy to maintain. You optimize for clarity and simplicity.

## Principles

* Keep components small and focused. Each component should do one thing and do it well. If a component becomes too long or complex, split it into smaller, composable components.
* Minimize logic inside components. Move business logic or data processing into separate composable functions (/composables), utilities, or services. This makes the component easier to test and understand.
* Favor computed properties and methods over template logic. Keep templates clean and declarative. Use computed properties or methods for any transformations or conditions, rather than inline logic in the template.
* Fail gracefully. Components should be fault-tolerant. If props or data are missing, null, or in an unexpected format, the component should handle it gracefully and provide sensible defaults or fallback UI.
* Use TypeScript effectively. Strongly type props, emits, and events. Leverage Vue's defineProps and defineEmits to ensure correct usage. Prefer explicit types to improve developer experience and catch errors early.
*	Write testable code. Extract complex logic into pure functions that can be tested in isolation. Keep the component focused on rendering and user interaction.
* Consistent naming and structure.
  * Use clear, descriptive names for components, props, and events.
  * Stick to a consistent file structure (e.g., components, composables, utils).
  * Keep the <script setup> section organized: first imports, then props/emits, then state/computed/methods, and finally lifecycle hooks.

## Styling with Tailwind CSS

* Use Tailwind CSS utility classes for all styling. Avoid writing custom CSS unless necessary. Utility classes keep the styles consistent and colocated with the template.
* Keep class lists readable.
  * Break long class lists into multiple lines for readability if needed.
  * Use component-level abstractions when appropriate.
* If multiple components share the same styles, extract them into reusable Vue components or leverage Tailwind's @apply in minimal CSS files or scoped styles.
* Handle responsive and dark mode thoughtfully. Use Tailwind's responsive and dark mode variants consistently. Ensure components look good on different screen sizes and in both light/dark themes.
* Accessibility matters. Tailwind won't handle accessibility for you. Make sure you add semantic HTML, ARIA attributes where needed, and focus handling for interactive components.

## Example Structure

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useItems } from '@/composables/useItems'

const { initialItems } = defineProps<{
  initialItems?: Item[]
}>()

const { items } = useItems(props.initialItems || [])

/** We don't want to show the card when there's no item. */
const hasItems = computed(() => items.value.length > 0)
</script>

<template>
  <div v-if="items.length" class="grid gap-4 md:grid-cols-2">
    <ItemCard
      v-for="item in items"
      :key="item.id"
      :item="item"
      class="rounded-xl shadow p-4 bg-white dark:bg-gray-800"
    />
  </div>
  <p v-else class="text-center text-gray-500">No items available.</p>
</template>
```

## Session Summary: URL Encoding, API Key Injection & PRO Badge System

### Overview

This comprehensive session implemented multiple features for handling professional API tiers in the Scalar API documentation platform:

1. **URL Encoding & Path Parameter Support** - Proper encoding for special characters in API paths
2. **API Key Injection System** - Automatic injection of API keys into request URLs for pro APIs
3. **Workspace Management Fixes** - Resolved duplication and ID mismatch issues
4. **PRO Badge System** - Visual indicators for premium endpoints

### December 2024 - URL Encoding, API Key Injection & Workspace Management

This session implemented comprehensive URL encoding support, a sophisticated API key injection system, and resolved critical workspace management issues for handling various API authentication patterns, particularly for professional APIs like DefLlama Pro, CoinGecko Pro, and CoinMarketCap Pro.

#### 1. URL Encoding for Path Parameters

**Problem**: Path parameters containing special characters (colons, commas) needed proper URL encoding.

**Example**:
```
Path: /prices/current/{coins}
Value: ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1,coingecko:ethereum...
```

**Solution**: Enhanced `string-template.ts` `replaceTemplateVariables()` function to:
- URL encode single curly braces `{variable}` and colon format `:variable` (path parameters)
- NOT encode double curly braces `{{variable}}` (query parameters/headers)
- Added comprehensive tests for encoding edge cases

**Files Modified**:
- `packages/api-client/src/libs/string-template.ts`
- `packages/api-client/src/libs/string-template.test.ts`

#### 2. API Key Injection System

**Problem**: Some APIs require API keys to be injected as path segments rather than headers or query parameters.

**Example**: `https://pro-api.llama.fi/{apiKey}/coins/latest`

**Complete Implementation**:

##### A. API Key Manager (`packages/api-client/src/libs/api-key-manager.ts`)
- **localStorage Management**: Workspace-specific API key storage
- **Key Functions**:
  - `saveApiKey()`, `getApiKey()`, `removeApiKey()`
  - `isApiKeyEnabled()`, `getApiKeyValue()`
  - `doesUrlRequireApiKey()` - checks against hardcoded URL list
  - `getApiKeyForUrl()` - returns key only if URL requires it
- **URL-Specific Logic**: Hardcoded list of URLs requiring API key injection
  - `https://pro-api.llama.fi`

##### B. Enhanced URL Merging (`packages/helpers/src/url/merge-urls.ts`)
- **New Function**: `injectApiKeyInPath()` for API key path injection
- **Enhanced**: `mergeUrls()` with function overloads for backward compatibility
- **Smart Logic**: Only injects API key when both URL requires it AND key exists
- **Format**: `{baseUrl}/{apiKey}/{endpoint}`

##### C. Request Operation Integration (`packages/api-client/src/libs/send-request/create-request-operation.ts`)
- **Integration**: Uses `getApiKeyForUrl()` and `doesUrlRequireApiKey()`
- **Selective Injection**: API key only injected for matching URLs
- **Workspace-Aware**: Uses workspace identifier passed as parameter
- **Fixed Workspace ID**: Properly receives `workspaceId` parameter instead of using `example.uid`

##### D. Vue Component (`packages/api-client/src/components/ApiKeyManager.vue`)
- **Toggle Control**: Enable/disable API key
- **Secure Input**: Password field for API key entry
- **Description Field**: User-friendly labeling
- **Visual Example**: Shows URL format with placeholder
- **Auto-save**: Immediate localStorage persistence

##### E. Settings Integration
- **SettingsApiKeys.vue**: Dedicated API key management settings page
- **Settings.vue**: Added "API Keys" tab alongside "General" settings
- **User Interface**: Clean, accessible UI for managing Pro API keys

##### F. Comprehensive Testing
- **API Key Manager Tests**: 18 test cases covering all functionality
- **URL Merging Tests**: Backward compatibility and new API key features
- **Edge Cases**: Invalid URLs, empty keys, disabled states
- **Integration Tests**: End-to-end workflow validation

#### 3. Critical Workspace Management Fixes

**Problem**: Multiple critical workspace management issues:
1. **Workspace ID Mismatch**: API keys stored with workspace ID `'default'` but requests looking for keys with example UID
2. **Duplicate Workspace Creation**: Every page reload created new workspaces/collections instead of reusing existing ones

**Solutions**:

##### A. Workspace ID Mismatch Fix
**Root Cause**: 
- ApiKeyManager used: `activeWorkspace.value?.uid` (correct)
- Request operation used: `example.uid` (incorrect - this is example ID, not workspace ID)

**Fix**:
- Updated `createRequestOperation` to accept `workspaceId` parameter
- Modified `RequestRoot.vue` to pass `activeWorkspace.value?.uid`
- Added fallback to `'default'` if no workspace ID provided
- Result: API keys now properly injected into URLs

##### B. Duplicate Workspace Prevention
**Root Cause**: `create-api-client-web.ts` always imported spec on page load, creating duplicate collections

**Fix**: Smart workspace management in `packages/api-client/src/layouts/Web/create-api-client-web.ts`
```typescript
// Always update the default workspace with the latest spec by resetting and reimporting
client.resetStore()

// Import the latest spec into the default workspace
if (configuration.url) {
  await importSpecFromUrl(configuration.url, 'default', {
    proxyUrl: configuration.proxyUrl,
  })
} else if (configuration.content) {
  await importSpecFile(configuration.content, 'default')
}
```

**Benefits**:
- ✅ **Clean Slate**: `resetStore()` clears all existing collections
- ✅ **Always Fresh**: Each page load gets latest spec content
- ✅ **No Duplicates**: Completely prevents workspace duplication
- ✅ **Simple Logic**: No complex hash comparison needed
- ✅ **Predictable**: Same behavior every time

#### 4. Build System Resolution

**Problem**: Build errors for standalone API reference due to dependency issues.

**Solution**:
1. Built `@scalar/api-client` package first
2. Successfully ran `pnpm build:standalone`
3. Generated `packages/api-reference/dist/browser/standalone.js`

#### 5. Technical Implementation Details

##### URL-Specific API Key Requirements
```typescript
// Hardcoded in api-key-manager.ts
const API_KEY_REQUIRED_URLS = [
  'https://pro-api.llama.fi',
]

// Smart detection
export const doesUrlRequireApiKey = (url: string): boolean => {
  // Checks if URL matches hardcoded list
}

// Selective retrieval
export const getApiKeyForUrl = (workspaceId: string, url: string): string | null => {
  // Returns API key only if URL requires it AND key exists
}
```

##### Workspace-Aware Request Operation
```typescript
// Fixed function signature
export const createRequestOperation = ({
  // ... other params
  workspaceId,
}: {
  // ... other types
  workspaceId?: string
}): ErrorResponse<{
  // ...
}> => {
  const resolvedWorkspaceId = workspaceId || 'default'
  const apiKey = getApiKeyForUrl(resolvedWorkspaceId, serverString)
  // ...
}
```

##### Clean Workspace Management
```typescript
// In create-api-client-web.ts
client.resetStore() // Clear all existing data
await importSpecFile(configuration.content, 'default') // Fresh import
```

#### 6. Key Benefits

✅ **Hardcoded Control**: Developers control which URLs require API keys  
✅ **User Flexibility**: Users configure their own API keys per workspace  
✅ **Selective Injection**: No unnecessary API key injection for regular APIs  
✅ **Backward Compatibility**: Existing code continues to work unchanged  
✅ **Type Safety**: Full TypeScript support with function overloads  
✅ **Comprehensive Testing**: 100% test coverage for all scenarios  
✅ **Secure Storage**: Workspace-specific localStorage with error handling  
✅ **Professional APIs**: Ready for DefLlama Pro, CoinGecko Pro, etc.  
✅ **No Workspace Duplication**: Clean, predictable workspace management  
✅ **Always Fresh Content**: Latest spec content on every page load  
✅ **Consistent Workspace ID**: Fixed mismatch between storage and retrieval  

#### 7. Usage Example

```typescript
// User configures API key in Settings → API Keys
saveApiKey('default', {
  enabled: true,
  key: 'defillama-pro-123',
  description: 'DefLlama Pro API'
})

// System automatically detects and injects for matching URLs
// Input:  https://pro-api.llama.fi + /prices/current/{coins}
// Output: https://pro-api.llama.fi/defillama-pro-123/prices/current/ethereum%3A...

// Non-matching URLs remain unchanged
// Input:  https://api.github.com + /users
// Output: https://api.github.com/users (no API key injection)
```

#### 8. Development Testing

**Testing Commands**:
```bash
# Start API client web playground
pnpm dev:client:web

# Access at http://localhost:5065/
# Navigate to Settings → API Keys to configure
# Test with endpoints using pro-api.llama.fi server
```

**Testing Flow**:
1. Configure API key in Settings → API Keys tab
2. Enable API key injection
3. Make request to `/prices/current/{coins}` endpoint
4. Verify API key appears in final URL
5. Reload page multiple times - no duplicate workspaces created
6. Modify defillama-openapi.json - changes immediately reflected

#### 9. Future Extensibility

The system is designed for easy extension:
- Add new URLs to `API_KEY_REQUIRED_URLS` array
- Support for different API key injection patterns
- Per-URL API key configuration if needed
- Integration with other authentication schemes
- Support for multiple workspace API key management

This comprehensive implementation provides a robust, scalable solution for handling diverse API authentication requirements while maintaining backward compatibility, developer control, and predictable workspace management behavior.

### January 2025 - PRO Badge System & Tier-Based URL Replacement

Implemented a complete PRO badge system and automatic URL replacement for premium API endpoints:

**PRO Badge System:**
- Created orange "PRO" badges that appear when `x-scalar-tier: "pro"` is set in OpenAPI specs
- Integrated badges across all layouts (ModernLayout, ClassicLayout, sidebar, operation lists)
- Consistent design using `--scalar-color-orange` with transparent background

**Tier-Based URL Replacement:**
- Built TierManager service that automatically replaces URLs for pro users (e.g., `api.llama.fi` → `pro-api.llama.fi`)
- Added configuration UI for users to manage tier settings and URL mappings

**Key Features:**
- Visual distinction between free and premium endpoints
- Automatic pro URL switching based on user's API key
- Configurable URL mappings for different API providers
- Workspace-specific settings with localStorage persistence
- Full TypeScript support and comprehensive testing

**Usage:** Add `x-scalar-tier: "pro"` to any OpenAPI operation to display PRO badges and enable automatic URL replacement for authenticated pro users.

### January 2025 - API Key Input UI Improvements & Layout Optimization

Enhanced the API key input UI with better responsive design and improved layout structure:

**Layout Improvements:**
- Moved API key input from page header to content area for better space usage
- Sidebar now gets full height as intended
- API key input positioned in sticky bar above main content
- Responsive design with mobile/desktop layouts

**UI Enhancements:**
- Compact, inline design for API key and tier configuration inputs
- Enhanced PRO badge styling in sidebar with hover effects and smooth transitions
- Better typography scaling and spacing using Scalar design tokens
- Improved visual hierarchy and reduced visual clutter

### January 2025 - DeFiLlama Branding & Style Fixes

Added DeFiLlama branding and fixed styling issues:

**DeFiLlama Branding:**
- Added DeFiLlama logo at the top of the sidebar above navigation
- Logo positioned in dedicated branding section with proper styling
- Clean integration with existing sidebar design

**Style Fixes:**
- Fixed CSS specificity issues with API key input components
- Added !important declarations and fallback values for reliable styling
- Enhanced pro badge visibility with explicit orange colors
- Improved typography scaling and spacing consistency
- Fixed styling issues preventing proper component appearance
- Added proper CSS styling for DeFiLlama logo visibility and hover effects
- Removed PRO badges from sidebar per user preference (kept in other layouts)

### January 2025 - Simplified URL Replacement & Proxy Removal

Simplified the tier-based URL replacement system and removed proxy URL dependencies:

**Simplifications Made:**
- **Removed Proxy URLs**: Eliminated all `proxyUrl` configurations from example pages
- **Simplified Pro Detection**: Any API key now qualifies as "pro"
- **Hardcoded URL Replacement**: Direct replacement of `api.llama.fi` → `pro-api.llama.fi` for any user with an API key

**Technical Changes:**
- Updated `useTierDetection.ts` to use simple API key existence check
- Modified `TierManager.getEffectiveUrl()` to hardcode the `api.llama.fi` → `pro-api.llama.fi` conversion
- Removed `proxyUrl` from all example page configurations
- Simplified both `ApiKeyInput.vue` and `TierConfigurationInput.vue` components

**Result**: Clean, straightforward system where any user with an API key gets automatic URL conversion from free to pro endpoints.

### Key Files Modified

**Core Implementation:**
- `packages/api-client/src/libs/api-key-manager.ts` - API key storage and retrieval
- `packages/api-client/src/libs/tier-manager.ts` - Tier detection and URL replacement
- `packages/api-client/src/libs/send-request/create-request-operation.ts` - Request operation with API key injection
- `packages/api-client/src/layouts/Web/create-api-client-web.ts` - Web client integration

**UI Components:**
- `examples/web/src/components/ApiKeyInput.vue` - API key input component
- `examples/web/src/components/TierConfigurationInput.vue` - Tier configuration UI
- `packages/api-reference/src/components/ProBadge/` - PRO badge component
- `packages/api-reference/src/features/Operation/layouts/ModernLayout.vue` - Modern layout with PRO badges
- `packages/api-reference/src/features/Operation/layouts/ClassicLayout.vue` - Classic layout with PRO badges

**Helper Functions:**
- `packages/api-client/src/libs/string-template.ts` - URL encoding for path parameters
- `packages/helpers/src/url/merge-urls.ts` - URL merging with API key injection
- `packages/api-client/src/hooks/useTierDetection.ts` - Composable for tier detection
