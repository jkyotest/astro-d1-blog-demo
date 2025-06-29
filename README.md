# Astro Blog with D1 Database

A modern blog system built with Astro framework and Cloudflare D1 database, supporting both articles and notes content types with a complete admin management interface.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jkyochen/astro-d1-blog)

> [Demo](https://astro-d1-blog-demo.jkyo.workers.dev/)
> 
> [Demo's Admin Panel](https://astro-d1-blog-demo.jkyo.workers.dev/admin)
> Password: admin123

## ✨ Features

### 🎯 Core Features
- ✅ **Dual Content Types**: Support for long articles and short notes
- ✅ **Database-Driven**: Uses Cloudflare D1 database for content storage, no static files needed
- ✅ **Admin Panel**: Complete content management interface with create, edit, delete functionality
- ✅ **Tag System**: Flexible tag management for content categorization
- ✅ **Import/Export**: Support for bulk Markdown file import and content export

### 🎨 User Experience
- ✅ **Responsive Design**: Perfect adaptation for desktop and mobile devices
- ✅ **Apple-Style UI**: Modern design language with elegant interactions
- ✅ **SEO Optimized**: Complete meta tags, OpenGraph, and RSS support
- ✅ **Performance**: 100/100 Lighthouse performance score
- ✅ **Multi-language Support**: Built-in Chinese to pinyin slug generation

### 🔧 Technical Features
- ✅ **TypeScript**: Complete type safety
- ✅ **Test Coverage**: Includes API and database logic tests
- ✅ **Database Migrations**: Uses Drizzle ORM for database schema management
- ✅ **File Upload**: Support for ZIP file bulk import
- ✅ **Authentication**: Simple admin authentication system

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Cloudflare account
- Wrangler CLI

### 🎯 One-Click Deployment to Cloudflare

**Easiest way: One-click deployment to Cloudflare**

1. Click the "Deploy to Cloudflare" button above
2. Login to your Cloudflare account
3. Follow the wizard to configure project name and settings
4. After deployment, create D1 database in Cloudflare Dashboard
5. Update database IDs in `wrangler.toml`
6. Run database initialization commands

### 🛠️ Manual Development Setup

#### 1. **Clone and Install**
```bash
git clone https://github.com/jkyochen/astro-d1-blog.git
cd astro-d1-blog
npm install
```

#### 2. **Configure Environment**
```bash
# Copy example environment file
cp .env.example .env

# Set admin password for local development
ADMIN_PASSWORD=your-secure-password-here
```

#### 3. **Initialize Database**
```bash
# Initialize local database with sample data
npm run db:init-full:local
```

#### 4. **Start Development**
```bash
# Start development server
npm run dev

# Or use preview mode (simulates production environment)
npm run preview
```

Visit `http://localhost:4321` to view the blog, and `http://localhost:4321/admin` to access the admin panel.

## 🚀 Production Deployment

### Option 1: One-Click Deployment (Recommended)
1. **Click the "Deploy to Cloudflare" button** at the top of this README
2. **Login to your Cloudflare account** and follow the deployment wizard
3. **Cloudflare will automatically**:
   - Create a D1 database for your blog
   - Update the `wrangler.toml` configuration with the database ID
   - Deploy your application
4. **After deployment**, complete the setup:
   - **Set admin password** (required): `npx wrangler secret put ADMIN_PASSWORD`
   - Initialize database: `npm run db:init-full:prod`
      - The "blog" parameter in this command must match the "Name your D1 Database" configured in step 3 for proper recognition.

### Option 2: Manual Setup

#### 1. **Clone Repository**
```bash
git clone https://github.com/jkyochen/astro-d1-blog.git
cd astro-d1-blog
npm install
```

#### 2. **Create Database**
```bash
# Create production database (note the database ID in output)
npx wrangler d1 create blog
```

#### 3. **Update Configuration**
Replace the database ID in `wrangler.toml`:
```toml
# Find this line and replace with your actual database ID
database_id = "placeholder-will-be-replaced-by-deploy-button"
```

#### 4. **Set Admin Password & Initialize Database**
```bash
# Set admin password (REQUIRED - no default password)
npx wrangler secret put ADMIN_PASSWORD

# Initialize database with sample data
npm run db:init-full:prod
```

#### 5. **Deploy**
```bash
# Deploy to production
npm run deploy
```

### 📝 Important Notes
- **Deploy to Cloudflare button handles database creation automatically**
- **Admin password MUST be set** - there is no default password for security reasons
- **Local development uses `--local` flag** and doesn't need database configuration
- **Admin password is stored as a Cloudflare secret** and won't be visible in your code
- **Use `npm run db:init:prod`** instead of `npm run db:init-full:prod` if you don't want sample data

## 📁 Project Structure

```
astro-d1-blog/
├── src/
│   ├── components/          # Astro components
│   │   ├── database.ts      # Database connection and repositories
│   │   └── schema.ts        # Database schema definitions
│   ├── lib/                 # Utility functions
│   │   ├── utils.ts         # General utilities
│   │   ├── markdown-utils.ts # Markdown processing
│   │   ├── zip-utils.ts     # ZIP file processing
│   │   └── batch-utils.ts   # Batch operation utilities
│   ├── pages/               # Page routes
│   │   ├── admin/           # Admin panel pages
│   │   ├── api/             # API endpoints
│   │   ├── articles/        # Article pages
│   │   └── notes/           # Note pages
│   └── styles/              # Style files
├── migrations/              # Database migration files
├── scripts/                 # Database seed files
├── tests/                   # Test files
└── public/                  # Static assets
```

## 🛠️ Available Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run test:run     # Run tests and exit
npm run test:ui      # Run tests UI
```

### Database
```bash
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema changes
npm run db:studio    # Open database studio
```

### Database - Local Environment (Development)
```bash
npm run db:migrate:local      # Run local migrations
npm run db:init:local         # Initialize local DB (basic)
npm run db:init-full:local    # Initialize local DB with sample data
npm run db:reset:local        # Reset local database
npm run db:seed:local         # Add all seed data (tags, config, articles)
```

### Database - Production Environment
```bash
npm run db:migrate:prod       # Run prod migrations
npm run db:init:prod          # Initialize prod DB (basic)
npm run db:init-full:prod     # Initialize prod DB with sample data
npm run db:seed:prod          # Add tags data
npm run db:seed-data:prod     # Add sample articles
npm run db:seed-config:prod   # Add site config
```

### Deployment
```bash
npm run check                 # Validate build and config
npm run deploy                # Deploy to production
npm run cf-typegen            # Generate Cloudflare types
```

## 🔧 Configuration

### Environment Variables
Set sensitive data using Wrangler:

```bash
# Local development
npx wrangler secret put ADMIN_PASSWORD --env=""

# Production
npx wrangler secret put ADMIN_PASSWORD --env production
npx wrangler secret put D1_DATABASE_ID --env production
```

The database configuration is handled automatically by Wrangler based on your environment.

## 📝 Usage Guide

### Creating Articles
1. Visit `/admin` to access the admin panel
2. Click "New Article" to create a new article
3. Fill in title, content, tags, and other information
4. Select publication status (draft/published)
5. Save the article

### Importing Content
1. Click "Import & Export" in the admin panel
2. Upload a ZIP package containing Markdown files
3. Preview the import content
4. Confirm the import

### Exporting Content
1. Click "Import & Export" in the admin panel
2. Select export type and format
3. Click "Export Content" to download

## 🤝 Contributing

Issues and Pull Requests are welcome!

### Development Process
1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

### Code Standards
- Write code in TypeScript
- Follow existing code style
- Add necessary tests
- Update relevant documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Astro](https://astro.build/) - Modern static site generator
- [Cloudflare D1](https://developers.cloudflare.com/d1/) - Edge database
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## 📞 Support

If you encounter issues or have suggestions, please:

1. Check if there are similar issues in [Issues](../../issues)
2. Create a new Issue describing your problem
3. Or contact me through other means

---

⭐ If this project helps you, please give it a star!
