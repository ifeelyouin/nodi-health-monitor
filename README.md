# Nodi production health monitor

This repository contains only a read-only check of two public endpoints:

- https://www.nodiboard.com
- https://okbrcfmvncdijyqzvpcz.supabase.co/auth/v1/health

It contains no application source, credentials, user information, or database access.
The checks validate the HTML app root and the existing Auth health response every
15 minutes, with a manual run available. A failed check fails the workflow so the
repository owner's existing GitHub Actions failure notifications continue to apply.
GitHub can delay or drop scheduled workflows; this is not a guaranteed uptime SLA.

Standard Linux runners in a public repository do not consume the account's private
Actions minutes. Keep this repository public and use standard ubuntu-latest runners.
GitHub may disable scheduled workflows in a public repository after 60 days without
repository activity. Once a month, the workflow records its month in `.monitor-month`
using the short-lived `GITHUB_TOKEN` scoped to this monitoring repository. This keeps
an actively used monitor from becoming inactive. A heartbeat failure fails the workflow
and leaves the health checks running; it never modifies the application repository.

Run locally with Node 22:

```sh
MONITOR_APP_URL=https://www.nodiboard.com \
MONITOR_SUPABASE_URL=https://okbrcfmvncdijyqzvpcz.supabase.co \
node monitor-health.mjs
```
