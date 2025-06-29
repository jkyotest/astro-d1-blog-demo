# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern, full-featured blog system built with Astro framework and Cloudflare D1 database. It supports dual content types (articles and notes) with a complete admin management interface.

### Core Features
- **Dual Content Types**: Support for long-form articles and short-form notes
- **Database-Driven**: Uses Cloudflare D1 database for dynamic content management
- **Admin Interface**: Complete content management system with authentication
- **Tag System**: Flexible tagging with many-to-many relationships
- **Import/Export**: Bulk Markdown import and content export capabilities
- **Multi-language**: Built-in support for Chinese, Japanese, and English content
- **SEO Optimized**: Complete meta tags, OpenGraph, RSS, and sitemap support

### Technology Stack
- **Astro 5.10.1** - Modern static site generator with server-side rendering
- **TypeScript** - Full type safety throughout the application
- **Cloudflare D1** - SQLite-compatible edge database
- **Drizzle ORM** - Type-safe database operations and migrations
- **Tailwind CSS** - Utility-first CSS framework for styling
- **Vitest** - Fast unit testing framework
- **Wrangler** - Cloudflare Workers development and deployment tool

## Essential Commands

### Development
- `npm run dev` - Start development server at localhost:4321
- `npm run build` - Build production site to ./dist/
- `npm run preview` - Build and preview locally with Wrangler
- `npm run check` - Type check and dry-run deploy (dev environment)
- `npm run check:prod` - Type check and dry-run deploy (production)

### Testing
- `npm run test` - Run Vitest tests in watch mode
- `npm run test:run` - Run tests once (no watch mode)
- `npm run test:ui` - Open Vitest UI interface

### Database Management
- `npm run db:generate` - Generate new migrations from schema changes
- `npm run db:push` - Push schema changes directly (development only)
- `npm run db:studio` - Open Drizzle Studio GUI for database inspection

### Database - Local Environment (--local flag)
- `npm run db:migrate:local` - Apply all migrations to local database
- `npm run db:init-full:local` - Complete setup with sample data
- `npm run db:reset:local` - Reset local database and reinitialize
- `npm run db:seed:local` - Add all seed data (tags, config, sample posts)

### Database - Development Environment (remote)
- `npm run db:migrate:dev` - Apply all migrations to dev database
- `npm run db:init:dev` - Initialize dev database (basic setup)
- `npm run db:init-full:dev` - Complete setup with sample data
- `npm run db:reset:dev` - Reset dev database and reinitialize
- `npm run db:seed:dev` - Add all seed data (tags, config, sample posts)

### Database - Production Environment
- `npm run db:migrate:prod` - Apply all migrations to production database
- `npm run db:init:prod` - Initialize production database (essential data only)
- `npm run db:init-full:prod` - Complete setup with sample data
- `npm run db:seed:prod` - Add basic tags data
- `npm run db:seed-data:prod` - Add sample posts (optional)
- `npm run db:seed-config:prod` - Add site configuration

### Deployment
- `npm run deploy` - Deploy to development environment
- `npm run deploy:prod` - Deploy to production environment
- `npm run cf-typegen` - Generate Cloudflare Worker types

## Architecture

### Database Integration
The project uses Cloudflare D1 (SQLite-compatible) with Drizzle ORM for type-safe database operations:

**Database Schema** (`src/db/schema.ts`):
- `posts` - Articles and notes with metadata (title, content, slug, type, status, language)
- `tags` - Tag management with name, slug, and description
- `post_tags` - Many-to-many relationship between posts and tags
- `site_config` - Site configuration and settings

**Key Features**:
- Dual content types: `article` (long-form) and `note` (short-form)
- Multi-language support: `auto`, `chinese`, `japanese`, `english`
- Draft/published status workflow
- Automatic slug generation with pinyin support for Chinese content
- Type-safe database operations with Drizzle ORM
- Automatic migrations with version control

### Admin Interface
Complete content management system accessible at `/admin`:

**Authentication**:
- Simple token-based authentication using localStorage
- Environment-based admin password configuration
- Session management with expiration

**Admin Features**:
- Dashboard with statistics and recent posts overview
- Article/note creation and editing with Markdown support
- Tag management and assignment
- Bulk import/export functionality (Markdown files and ZIP packages)
- Site configuration management
- Real-time preview and draft management

**Admin Components**:
- `AdminLayout.astro` - Admin panel layout wrapper
- `MarkdownEditor.astro` - Rich Markdown editor with preview
- `PostEditor.astro` - Post creation/editing form
- `PostCard.astro` - Post display card component

### API Structure
RESTful API endpoints for all data operations:

**Posts API** (`/api/posts/`):
- `GET /api/posts` - List posts with filtering and pagination
- `POST /api/posts` - Create new post
- `GET /api/posts/[id]` - Get single post
- `PUT /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post

**Tags API** (`/api/tags/`):
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create new tag

**Other APIs**:
- `/api/auth/login` - Admin authentication
- `/api/stats` - Dashboard statistics
- `/api/site-config` - Site configuration management
- `/api/import/markdown` - Bulk Markdown import
- `/api/export/[id]` - Individual post export
- `/api/export/bulk` - Bulk content export

### Public Routing Structure
File-based routing optimized for SEO and user experience:

**Content Routes**:
- `/` - Homepage with recent posts
- `/articles` - Article listing page
- `/articles/[slug]` - Individual article pages
- `/notes` - Note listing page  
- `/notes/[slug]` - Individual note pages
- `/posts` - Combined posts view
- `/tags` - Tag listing page
- `/rss.xml` - RSS feed

**Admin Routes**:
- `/admin` - Admin dashboard
- `/admin/login` - Admin login page
- `/admin/articles/new` - New article creation
- `/admin/articles/[id]` - Article editing
- `/admin/notes/new` - New note creation
- `/admin/notes/[id]` - Note editing
- `/admin/tags` - Tag management
- `/admin/site-config` - Site settings
- `/admin/import-export` - Import/export tools

### Key Components
**Layout Components**:
- `BaseHead.astro` - SEO meta tags, Open Graph, and Twitter cards
- `Header.astro` / `Footer.astro` - Site navigation with dynamic menu
- `BlogPost.astro` - Blog post layout with structured data

**Utility Components**:
- `FormattedDate.astro` - Localized date formatting
- `Pagination.astro` - Pagination controls for lists
- `TagList.astro` - Tag display and filtering

**Content Components**:
- `PostCard.astro` - Post preview cards for listings
- `MarkdownEditor.astro` - Rich Markdown editor for admin

### Configuration Files
- `astro.config.mjs` - Astro configuration with Cloudflare adapter and integrations
- `wrangler.toml` - Cloudflare Workers deployment config with D1 bindings
- `drizzle.config.ts` - Database migration and schema configuration
- `tailwind.config.mjs` - Tailwind CSS configuration with custom colors
- `vitest.config.ts` - Test configuration with path aliases
- `tsconfig.json` - Strict TypeScript configuration

## Development Workflow

### Local Development Setup
1. **Clone and Install Dependencies**:
   ```bash
   git clone <repository-url>
   cd astro-d1-blog
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   # Set local admin password
   npx wrangler secret put ADMIN_PASSWORD --env=""
   ```

3. **Database Initialization**:
   ```bash
   # Complete local setup with sample data
   npm run db:init-full:local
   ```

4. **Start Development**:
   ```bash
   npm run dev  # Development server at localhost:4321
   # OR
   npm run preview  # Production simulation with Wrangler
   ```

### Content Management Workflow

**Creating Articles**:
1. Visit `/admin` (login with configured admin password)
2. Click "New Article" for long-form content
3. Fill in title, content (Markdown supported), tags, and metadata
4. Choose status: `draft` (private) or `published` (public)
5. Set language for automatic slug generation and language detection
6. Save to database

**Creating Notes**:
1. Visit `/admin` and click "New Note" for short-form content
2. Notes have optional titles and focus on quick content
3. Same tagging and status system as articles
4. Optimized for microblogging and quick thoughts

**Tag Management**:
- Create and manage tags from `/admin/tags`
- Tags support descriptions and automatic slug generation
- Many-to-many relationship allows multiple tags per post
- Pre-populated with common programming and language tags

### Database Development

**Schema Changes**:
1. Modify `src/db/schema.ts` with new table definitions
2. Generate migration: `npm run db:generate`
3. Apply to local: `npm run db:migrate:local`
4. Test changes and commit migration files

**Multi-Environment Management**:
- **Local**: Uses `--local` flag, stored in `.wrangler/state/`
- **Development**: Remote D1 database for team development
- **Production**: Separate production database with minimal sample data

**Database Operations**:
```bash
# Reset and reinitialize local database
npm run db:reset:local

# Add sample data for testing
npm run db:seed:local

# Open database GUI for inspection
npm run db:studio
```

### Import/Export Workflow

**Bulk Import**:
1. Prepare Markdown files with frontmatter metadata
2. Package into ZIP file or use individual files
3. Use `/admin/import-export` interface
4. Preview imported content before committing
5. Posts auto-generate slugs and detect language

**Content Export**:
1. Individual posts: `/api/export/[id]` for single post
2. Bulk export: `/api/export/bulk` for all content
3. Supports Markdown format with frontmatter
4. ZIP packaging for bulk downloads

### Testing Workflow

**Running Tests**:
```bash
npm run test          # Watch mode for development
npm run test:run      # Single run for CI/CD
npm run test:ui       # Visual test interface
```

**Test Structure**:
- API endpoint tests in `tests/api/`
- Database logic tests in `tests/utils/`
- Mock environment setup in `tests/setup/`
- All tests use TypeScript with Vitest framework

### Deployment Workflow

#### Production Deployment Options

**Option 1: One-Click Deployment (Recommended)**
1. **Initial Deployment**: Use the "Deploy to Cloudflare" button in README
2. **Post-Deployment Configuration**:
   ```bash
   # Create production database
   npx wrangler d1 create blog-prod
   
   # Update wrangler.toml with the returned database ID
   # Replace "your-prod-database-id-here" with actual ID
   
   # Set admin password
   npx wrangler secret put ADMIN_PASSWORD --env production
   
   # Initialize database
   npm run db:init-full:prod
   
   # Redeploy with database configuration
   npm run deploy:prod
   ```

**Option 2: Fork Repository and Manual Setup**
1. **Repository Setup**:
   ```bash
   # Fork repository on GitHub, then clone
   git clone https://github.com/YOUR_USERNAME/astro-d1-blog.git
   cd astro-d1-blog
   npm install
   ```

2. **Database Setup**:
   ```bash
   # Create production database (note the database ID)
   npx wrangler d1 create blog-prod
   ```

3. **Configuration Update**:
   - Edit `wrangler.toml` and replace `your-prod-database-id-here` with actual database ID
   - Commit the configuration changes to your forked repository

4. **Deploy**:
   ```bash
   npm run check:prod    # Validate production config
   npm run deploy:prod   # Deploy to production
   ```

#### Development Deployment
```bash
# Create development database (if not exists)
npx wrangler d1 create blog-dev

# Update wrangler.toml with dev database ID
# Replace "your-dev-database-id-here" with actual ID

# Deploy to development environment
npm run check         # Validate build and config
npm run deploy        # Deploy to dev environment
```

#### Environment Configuration Requirements

**Database Configuration**:
- **Database IDs must be configured in `wrangler.toml`** - environment variable substitution is not supported
- **Local Environment**: Uses `--local` flag, no database ID needed
- **Development Environment**: Requires `your-dev-database-id-here` replacement
- **Production Environment**: Requires `your-prod-database-id-here` replacement

**Secrets Management**:
```bash
# Set admin password for each environment
npx wrangler secret put ADMIN_PASSWORD                    # Local/default
npx wrangler secret put ADMIN_PASSWORD --env production   # Production
```

**Configuration Files**:
- `wrangler.toml`: Database bindings and environment configurations
- `.env.example`: Template for local development environment variables
- Secrets are stored in Cloudflare and not visible in code

#### Important Deployment Notes

**GitHub Deployment Limitations**:
- Database IDs cannot be environment variables in `wrangler.toml`
- Users must fork repository and update database IDs manually
- Sensitive data (admin passwords) are stored as Cloudflare secrets

**Database Initialization**:
```bash
# Minimal setup (essential data only)
npm run db:init:prod

# Full setup (with sample data)
npm run db:init-full:prod
```

**Deployment Validation**:
- Always run `npm run check:prod` before production deployment
- Verify database connections after deployment
- Test admin panel access with configured password

### Styling and Theming
- **Tailwind CSS**: Utility-first framework with custom configuration
- **Global Styles**: `src/styles/global.css` for base styles and CSS variables
- **Component Styles**: Scoped styles within Astro components
- **Responsive Design**: Mobile-first approach with responsive utilities
- **Dark Mode**: CSS custom properties ready for theme switching

### SEO and Performance
- **Automatic Sitemap**: Generated via @astrojs/sitemap integration
- **RSS Feed**: Dynamic RSS generation at `/rss.xml`
- **Meta Tags**: Complete OpenGraph and Twitter Card support
- **Performance**: Static generation with edge-side rendering
- **Lighthouse Score**: Optimized for 100/100 performance score

### Multi-language Support
- **Language Detection**: Automatic language detection for content
- **Slug Generation**: Pinyin conversion for Chinese content
- **Language Tags**: Built-in language-specific tags
- **URL Structure**: Language-agnostic routing system

## Project Structure

```
astro-d1-blog/
├── src/
│   ├── components/           # Reusable Astro components
│   │   ├── AdminLayout.astro      # Admin panel layout wrapper
│   │   ├── BaseHead.astro         # SEO meta tags and head elements
│   │   ├── Footer.astro           # Site footer with navigation
│   │   ├── FormattedDate.astro    # Date formatting utility
│   │   ├── Header.astro           # Site header with navigation
│   │   ├── HeaderLink.astro       # Navigation link component
│   │   ├── MarkdownEditor.astro   # Rich Markdown editor for admin
│   │   ├── Pagination.astro       # Pagination controls
│   │   ├── PostCard.astro         # Post preview card for listings
│   │   ├── PostEditor.astro       # Post creation/editing form
│   │   └── TagList.astro          # Tag display and filtering
│   │
│   ├── db/                   # Database layer
│   │   ├── database.ts            # Database connection and repositories
│   │   └── schema.ts              # Drizzle ORM schema definitions
│   │
│   ├── layouts/              # Page layout templates
│   │   └── BlogPost.astro         # Blog post layout with structured data
│   │
│   ├── lib/                  # Utility functions and helpers
│   │   ├── batch-utils.ts         # Batch operation utilities
│   │   ├── config.ts              # Site configuration helpers
│   │   ├── json-utils.ts          # JSON parsing utilities
│   │   ├── markdown-utils.ts      # Markdown processing functions
│   │   ├── utils.ts               # General utility functions
│   │   └── zip-utils.ts           # ZIP file processing
│   │
│   ├── pages/                # File-based routing
│   │   ├── admin/                 # Admin interface pages
│   │   │   ├── articles/
│   │   │   │   ├── [id].astro     # Article editing page
│   │   │   │   └── new.astro      # New article creation
│   │   │   ├── notes/
│   │   │   │   ├── [id].astro     # Note editing page
│   │   │   │   └── new.astro      # New note creation
│   │   │   ├── import-export.astro # Import/export tools
│   │   │   ├── index.astro        # Admin dashboard
│   │   │   ├── login.astro        # Admin login page
│   │   │   ├── site-config.astro  # Site configuration
│   │   │   └── tags.astro         # Tag management
│   │   │
│   │   ├── api/                   # API endpoints
│   │   │   ├── auth/
│   │   │   │   └── login.ts       # Admin authentication
│   │   │   ├── export/
│   │   │   │   ├── [id].ts        # Individual post export
│   │   │   │   └── bulk.ts        # Bulk content export
│   │   │   ├── import/
│   │   │   │   ├── markdown.ts    # Markdown import processing
│   │   │   │   └── preview.ts     # Import preview
│   │   │   ├── posts/
│   │   │   │   ├── [id].ts        # Individual post CRUD
│   │   │   │   └── index.ts       # Post listing and creation
│   │   │   ├── site-config/
│   │   │   │   └── index.ts       # Site configuration API
│   │   │   ├── stats/
│   │   │   │   └── index.ts       # Dashboard statistics
│   │   │   └── tags/
│   │   │       └── index.ts       # Tag management API
│   │   │
│   │   ├── articles/              # Article pages
│   │   │   ├── [...slug].astro    # Dynamic article pages
│   │   │   └── index.astro        # Article listing
│   │   │
│   │   ├── notes/                 # Note pages
│   │   │   ├── [...slug].astro    # Dynamic note pages
│   │   │   └── index.astro        # Note listing
│   │   │
│   │   ├── index.astro            # Homepage
│   │   ├── posts.astro            # Combined posts view
│   │   ├── rss.xml.js             # RSS feed generation
│   │   └── tags.astro             # Tag listing page
│   │
│   ├── styles/               # Styling
│   │   └── global.css             # Global styles and CSS variables
│   │
│   ├── types/                # TypeScript type definitions
│   │   └── database.ts            # Database and API types
│   │
│   ├── consts.ts             # Application constants
│   └── env.d.ts              # Environment type definitions
│
├── migrations/               # Database migrations
│   ├── 0000_yummy_turbo.sql      # Initial schema migration
│   └── meta/                     # Migration metadata
│       ├── 0000_snapshot.json    # Schema snapshot
│       └── _journal.json         # Migration journal
│
├── scripts/                  # Database seed scripts
│   ├── seed-data.sql             # Sample posts and additional data
│   ├── seed-site-config.sql      # Site configuration data
│   └── seed-tags.sql             # Basic tag data
│
├── tests/                    # Test files
│   ├── api/                      # API endpoint tests
│   │   ├── auth-real.test.ts     # Authentication tests
│   │   ├── database-logic.test.ts # Database operation tests
│   │   └── simplified-api.test.ts # Simplified API tests
│   ├── setup/                    # Test setup utilities
│   │   └── test-server.ts        # Test server configuration
│   └── utils/                    # Utility tests
│       ├── database.test.ts      # Database utility tests
│       └── mock-env.ts           # Mock environment setup
│
├── public/                   # Static assets
│   └── favicon.svg               # Site favicon
│
├── astro.config.mjs          # Astro configuration
├── drizzle.config.ts         # Database configuration
├── package.json              # Dependencies and scripts
├── tailwind.config.mjs       # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Test configuration
├── wrangler.toml             # Cloudflare Workers configuration
└── worker-configuration.d.ts # Cloudflare Workers type definitions
```

### Key Directory Explanations

**`src/components/`**: Reusable Astro components for both public and admin interfaces. Components follow Astro's component syntax and can include both server-side and client-side functionality.

**`src/db/`**: Database layer with Drizzle ORM schema definitions and connection utilities. The schema file defines all database tables and their relationships.

**`src/lib/`**: Utility functions and business logic. This includes Markdown processing, configuration management, and various helper functions used throughout the application.

**`src/pages/`**: File-based routing system. Each `.astro` file becomes a route, and dynamic routes use bracket notation. API endpoints are defined in the `api/` subdirectory.

**`src/pages/admin/`**: Complete admin interface for content management. Protected by authentication and provides full CRUD operations for posts, tags, and site configuration.

**`src/pages/api/`**: RESTful API endpoints for all data operations. These handle database interactions and provide JSON responses for both the admin interface and potential external integrations.

**`migrations/`**: Drizzle ORM generated migrations. These SQL files define the database schema evolution and are automatically applied during deployment.

**`scripts/`**: Database seed files for initializing data. These include basic tags, site configuration, and optional sample content.

**`tests/`**: Comprehensive test suite covering API endpoints, database operations, and utility functions. Uses Vitest for fast testing with TypeScript support.

# Database Migration from schema.sql to Drizzle ORM

## Migration Completed ✅

The project has been successfully migrated from manual SQL schema (`schema.sql`) to Drizzle ORM.

### New Database Structure:

1. **Drizzle Schema**: `src/db/schema.ts` - TypeScript schema definitions
2. **Migration Files**: `migrations/` directory - Auto-generated SQL migrations
3. **Seed Data**: `scripts/seed-tags.sql` - Initial tags data

### Database Commands:

#### For Local Development (Wrangler --local):
```bash
# Quick setup (schema + basic tags + site config)
npm run db:init:local

# Full setup with sample data (all above + sample posts)
npm run db:init-full:local

# Or run separately:
npm run db:migrate:local     # Apply all migrations
npm run db:seed:local        # Add initial tags
npm run db:seed-config:local # Add site configuration
npm run db:seed-data:local   # Add sample posts (optional)
```

#### For Remote Development Environment:
```bash
# Quick setup (schema + basic tags + site config)
npm run db:init:dev

# Full setup with sample data (all above + sample posts)
npm run db:init-full:dev

# Or run separately:
npm run db:migrate:dev       # Apply all migrations
npm run db:seed:dev          # Add initial tags
npm run db:seed-config:dev   # Add site configuration
npm run db:seed-data:dev     # Add sample posts (optional)
```

#### For Production Environment:
```bash
# Quick setup (schema + basic tags + site config)
npm run db:init:prod

# Full setup with sample data (all above + sample posts)  
npm run db:init-full:prod

# Or run separately:
npm run db:migrate:prod      # Apply all migrations
npm run db:seed:prod         # Add initial tags
npm run db:seed-config:prod  # Add site configuration
npm run db:seed-data:prod    # Add sample posts (optional)
```

#### Drizzle Development Tools:
```bash
npm run db:generate     # Generate new migrations
npm run db:push        # Push schema directly (dev only)
npm run db:studio      # Open Drizzle Studio GUI
```

### Files Removed:
- ❌ `schema.sql` - No longer needed, replaced by Drizzle migrations
- ❌ `scripts/add-language-tags.js` - Functionality merged into seed-tags.sql
- ❌ `scripts/add-language-tags.sql` - Functionality merged into seed-tags.sql  
- ❌ `scripts/migrate-types.sql` - Not needed with Drizzle schema
- ❌ `scripts/init-db.js` - Replaced by Drizzle migration commands

### Files Kept:
- ✅ `scripts/seed-tags.sql` - Basic tags (required)
- ✅ `scripts/seed-site-config.sql` - Site configuration (required)
- ✅ `scripts/seed-data.sql` - Sample posts and additional tags (optional)

### Migration Benefits:
- ✅ Type-safe database operations
- ✅ Automatic migration generation
- ✅ Better development tooling
- ✅ Consistent schema versioning
- ✅ Multi-environment support

### Quick Start Database Setup:

**For Local Development:**
```bash
npm run db:init-full:local  # Sets up everything including sample data
```

**For Remote Development:**
```bash
npm run db:init-full:dev    # Sets up everything on remote dev database
```

**For Production:**
```bash
npm run db:init:prod        # Sets up essential data only (no samples)
```

### Environment Support:
- **Local**: Uses Wrangler's local D1 database (--local flag)
- **Development**: Uses remote D1 database `blog-db-dev`  
- **Production**: Uses remote D1 database `blog-db-prod`

All migration scripts now support multiple SQL files automatically via glob patterns.

## Testing

The project uses Vitest for testing with:
- Node.js environment configuration
- Global test utilities enabled
- Path alias support (`@/` points to `src/`)
- Test files: `**/*.{test,spec}.{js,ts}`