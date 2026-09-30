import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext adapter config for Cloudflare Workers.
 *
 * The default (in-memory) incremental cache is used on purpose: every route in
 * this app is either dynamic (session scoped) or cached at the Material Hub
 * fetch layer with an explicit `revalidate`, so no extra R2/KV binding is
 * required to run the site.
 */
export default defineCloudflareConfig({});
