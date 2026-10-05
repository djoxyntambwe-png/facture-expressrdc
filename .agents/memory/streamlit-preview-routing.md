---
name: Streamlit preview routing
description: A healthy standalone Streamlit workflow may still be unavailable through the Replit root preview.
---

A standalone Streamlit process can listen on its configured port and return HTTP 200 locally while the Replit development domain returns 404 because no artifact service owns the root route.

**Why:** Preview availability depends on Replit route registration, not only on whether the server process is healthy.

**How to apply:** Check the proxied app preview itself. For a user-facing web app in this workspace, prefer a registered web artifact at `/` and do not treat a local health check as proof that the preview works.
