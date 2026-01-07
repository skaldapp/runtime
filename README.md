# VueBro Runtime

VueBro Runtime is a Vue.js-based runtime environment that serves as the execution layer for VueBro applications. This project provides the core infrastructure to render and manage Vue applications with advanced features like dynamic component loading, SEO optimization, and intersection observer tracking.

## Features

- **Vue 3 Powered**: Built on top of Vue 3 with Composition API
- **Dynamic Component Loading**: Components are dynamically loaded using the `@vuebro/loader-sfc` package
- **SEO Optimized**: Built-in SEO meta management using `@unhead/vue`
- **Intersection Tracking**: Uses Intersection Observer API to track component visibility
- **UnoCSS Integration**: Utility-first CSS styling with UnoCSS
- **Font Loading**: Dynamic web font loading capabilities
- **Icon Support**: Built-in Iconify integration for SVG icons
- **Code Splitting**: Dynamic imports for efficient loading

## Architecture

The runtime follows a monolithic architecture with several key components:

1. **Main Application**: The `main.ts` entry point initializes the Vue app, router, and UnoCSS runtime
2. **State Management**: Uses reactive stores in the `src/stores/monolit.ts` file to manage application state
3. **Dynamic Loading**: Components are dynamically loaded based on JSON configuration files
4. **Smart Routing**: Intelligent scroll management that updates routes based on component visibility

## Dependencies

- Vue 3 (v3.5.22+)
- Vue Router (v4.6.3+)
- UnoCSS runtime for styling
- VueUse for composable utilities
- Iconify for icon management
- @vuebro/shared and @vuebro/loader-sfc for ecosystem integration

## Building and Running

### Prerequisites

- Node.js (latest version)
- pnpm (or npm/yarn)

### Commands

- `npm run build` - Builds the project using Vite and TypeScript
- `npm run lint` - Lints the codebase using ESLint

### Build Configuration

The project uses Vite for bundling with a custom configuration:

- Externalizes Vue, Vue Router, and loader dependencies
- Creates manual chunks for shared libraries and UnoCSS
- Uses `vite-plugin-static-copy` to copy external dependencies to the dist folder
- Generates a manifest file that includes external dependencies

## Integration with VueBro Ecosystem

This runtime is designed to work with the broader VueBro ecosystem:

- Receives data from `index.json` and `fonts.json` files
- Uses `@vuebro/shared` for common utilities
- Dynamic components loaded from `./pages/` directory
- Uses `@vuebro/configs` for shared Vite, TypeScript, and UnoCSS configurations

## File Structure

```text
src/
├── stores/          # State management stores
├── views/           # Page view components
├── App.vue          # Root application component
├── env.d.ts         # TypeScript environment declarations
├── main.ts          # Application entry point
└── style.css        # Global styles
```

## License

This project is licensed under the AGPL-3.0-or-later license.
