/// <reference types="astro/client" />

// Cloudflare Workers environment types
interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  ADMIN_PASSWORD?: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    user?: {
      isAdmin: boolean;
    };
  }
}
