---
name: Vercel build ports
description: Vercel owns PORT; static Vite builds should not depend on or override it.
---

For Vercel-bound static Vite apps, do not assign `PORT` in service environment configuration or read `process.env.PORT` in Vite config. Keep any local development port explicit and aligned with the artifact's `localPort`; the production build should not depend on a server port.

**Why:** Vercel rejected this app's build because `PORT` was read-only. Removing the explicit environment override and the Vite config dependency allowed the build to complete.

**How to apply:** Run the production build without a `PORT` assignment, and keep platform-specific runtime port settings out of static build configuration.
