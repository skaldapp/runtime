# Skald Runtime

Vue.js-based runtime for Skald applications with dynamic loading, SEO optimization, and intersection observer tracking.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Development](#development)
- [Build Process](#build-process)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## Overview

Skald Runtime is a powerful Vue.js-based runtime environment that serves as the execution layer for Skald applications. It provides the core infrastructure to render and manage Vue applications with advanced features like dynamic component loading, SEO optimization, and intersection observer tracking. The runtime is built with Vue 3's Composition API and follows modern web development practices.

## Features

- **Vue 3 Powered**: Built on top of Vue 3 with Composition API (v3.5.27+)
- **Dynamic Component Loading**: Components are dynamically loaded from markdown files using the `@skaldapp/loader-sfc` package
- **SEO Optimized**: Built-in SEO meta management using `@unhead/vue`
- **Markdown Processing**: Full-featured markdown processing with multiple plugins for enhanced functionality
- **UnoCSS Integration**: Utility-first CSS styling with UnoCSS runtime
- **Syntax Highlighting**: Integrated with Highlight.js for code syntax highlighting
- **Mathematical Expressions**: Support for KaTeX for mathematical expressions
- **Emoji Support**: Full emoji support with Twemoji integration
- **Responsive Design**: Mobile-first responsive design principles
- **Code Splitting**: Dynamic imports for efficient loading

## Installation

### Prerequisites
- Node.js (latest LTS version recommended)
- pnpm (or npm/yarn)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/skaldapp/runtime.git
cd runtime
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

3. Verify the installation:
```bash
pnpm run build
# or
npm run build
```

## Usage

### Development Server

The Skald Runtime doesn't include a development server by default. To use it, you typically serve the built files or integrate it with your own development server.

### Building for Production

To build the runtime for production:

```bash
pnpm run build
# or
npm run build
```

The built files will be placed in the `dist/` directory.

### Linting

To lint the codebase:

```bash
pnpm run lint
# or
npm run lint
```

## Configuration

### Project Structure

```
src/
├── stores/          # Dynamic component loading logic (main.ts)
├── views/           # Page view components (PageView.vue, NotFoundView.vue)
├── App.vue          # Root application component
├── env.d.ts         # TypeScript environment declarations
├── main.ts          # Application entry point
├── shims-vue.d.ts   # Vue type shims
└── style.css        # Global styles
```

### Main Entry Point (`src/main.ts`)

The main application flow:
1. Fetches `index.json` from the ./docs directory
2. Sets up Vue Router with dynamic routes based on document configurations
3. Initializes the Vue application with SEO head management
4. Mounts the Vue application to the '#app' element

### Dynamic Component Loading (`src/stores/main.ts`)

The dynamic loading system:
- Loads markdown files from the ./docs directory
- Processes markdown with multiple plugins
- Converts markdown to Vue SFC components
- Applies UnoCSS transformations to styles
- Dynamically creates Vue components at runtime

## Development

### Scripts

- `pnpm run build` - Builds the project using Vite and TypeScript
- `pnpm run lint` - Lints the codebase using ESLint

### Development Conventions

- TypeScript is used throughout the project
- Pug templating language is used in Vue components
- UnoCSS for utility-first styling
- Component-based architecture with dynamic loading
- SEO-first approach with meta tags and structured data
- Responsive design principles
- Markdown-driven content management

### Markdown Processing Pipeline

The runtime implements a comprehensive markdown processing pipeline:
- Syntax highlighting with Highlight.js
- Emoji support with Twemoji
- Multiple markdown-it plugins for extended functionality
- Frontmatter extraction and processing
- SFC (Single File Component) extraction from markdown
- UnoCSS directive transformation

## Build Process

The project uses Vite for bundling with a custom configuration:

- Externalizes Vue, Vue Router, and loader dependencies
- Creates manual chunks for shared libraries and UnoCSS
- Uses `vite-plugin-static-copy` to copy external dependencies to the dist folder
- Generates a manifest file that includes external dependencies
- Includes import maps for efficient module loading

The build process also generates import maps for efficient module loading in browsers that support them.

## Architecture

### Core Components

- **Main Application**: The `main.ts` entry point initializes the Vue app, router, and UnoCSS runtime
- **Dynamic Loading**: Components are dynamically loaded from markdown files based on JSON configuration
- **Smart Routing**: Intelligent routing system that creates routes based on document structure
- **Markdown Processing**: Comprehensive markdown processing pipeline with multiple plugins
- **State Management**: Uses shared stores from `@skaldapp/shared` for application state

### Integration with Skald Ecosystem

This runtime is designed to work with the broader Skald ecosystem:
- Receives data from `index.json` and markdown files in the docs directory
- Uses `@skaldapp/shared` for common utilities and state management
- Dynamic components loaded from `./docs/` directory
- Uses `@skaldapp/configs` for shared Vite, TypeScript, and UnoCSS configurations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

Please make sure to update tests as appropriate and follow the existing code style.

## License

This project is licensed under the AGPL-3.0-or-later License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Vue.js team for the excellent framework
- UnoCSS team for the utility-first CSS framework
- Markdown-It community for the extensible markdown parser
- All contributors to the various open-source packages used in this project