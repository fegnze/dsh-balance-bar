# DSH Sidebar Balance Bar

English | [中文](<docs/zh.md>)

`dsh-balance-bar` is a community desktop plugin (not an official DeepSeek product), compatible with DSH 0.2.0-rc.2. It adds a persistent top-up balance bar in the native `sidebar.footer.action` slot, above the existing account entry. It does not replace that entry, modify core code, inject positioning DOM, or start an additional service.

## Behavior

- Uses Host `deepseekAccount.getBalance()` and the current login, without reading credentials or passing them to the frontend.
- The Client reads every 10 seconds; the Host queries upstream on demand, with a minimum interval of 30 seconds and coalesced concurrent requests. Reads pause while the page is hidden and resume with a check when the window returns, still respecting the cache interval. This is not real-time server push. Clicking the bar uses the same `globalThis.dshPlatform.open('usage', bounds)` bridge as the native button to embed the official usage page inside DSH, without opening an external browser. The plugin provides a back button, viewport-size synchronization, and cleanup on close; the native bridge still manages credentials. The entry is disabled when the desktop bridge is unavailable or the account is signed out. This bridge depends on the current desktop version and must be reverified after upgrades.
- Top-up and promotional balances are not added together. The main bar shows the top-up balance; the tooltip shows the promotional balance and update time. An empty wallet displays `—`, not a fabricated zero balance.
- The Host listens for account changes and clears its cache, using generation checks to discard in-flight responses from before an account switch. The frontend reflects sign-out no later than the next successful read. Network failures clear the frontend amount; upstream Host failures retain the old amount with an explicit stale indicator.
- Collapsing the sidebar hides the balance bar; the original account entry remains clickable. All requests, subscriptions, timers, styles, and registrations are cleaned up on plugin unload. The upstream service does not accept cancellation parameters; already-started requests can only have their results discarded after completion.
- The local `/myspace-balance-bar/api` route restricts requests to loopback, a valid Host, same-origin Origin/Fetch Metadata, and a custom request header. Only local browsers are supported; CORS is not provided.

## Development and installation

Install the npm package `dsh-balance-bar` through the DSH plugin manager. No API key is required: it uses the official account currently signed into DSH. Only the desktop profile is supported; do not install it in the Web profile.

No build is required; the native ModuleLoader Client ships in the package. For development, install `link:/absolute/path/to/dsh-balance-bar`. Disabling the bundle removes the balance bar. Restarting DSH after an upgrade is recommended to avoid running old code from the Host module cache.

Disable or uninstall the old local package `myspace-dsh-balance-bar` before installing this package. Do not enable both at once: they share route and slot identifiers.

Source and issue tracker: https://github.com/fegnze/dsh-balance-bar.

```sh
npm test
node --check src/client.js
```

Verification covers balance caching, request coalescing, failure states, sign-out and account switching, discarding in-flight responses on unload, and request-origin validation. The balance bar and embedded official usage page have been verified on DSH 0.2.0-rc.2 desktop. The centered loading spinner has been checked in code, but its loading phase has not been captured separately on the real application. Account sign-out is covered by isolated tests; acceptance testing does not sign the user out.

## Limitations

- Balances are polled, not pushed in real time; statistics on the official usage page may be delayed.
- The native embedded page uses the current desktop bridge; navigation in an ordinary browser is not supported.
- Loading shows only a centered spinner, without explanatory text. It does not rotate when the system prefers reduced motion.
- This plugin does not collect account credentials, upload balances, or provide top-up operations.

## Trusted publishing

[The publishing workflow](<.github/workflows/publish.yml>) uses GitHub Actions OIDC without storing an npm token. Run it manually on `main` with the reviewed full commit SHA in `expected_sha`. `dry_run` defaults to true; set it to false only for an approved new-version publication. The workflow rejects a mismatched SHA before publishing.

In the npm package's Trusted Publisher settings, configure GitHub Actions, owner `fegnze`, repository `dsh-balance-bar`, and workflow `publish.yml`, leaving Environment empty. The npm account owner must complete two-factor authentication for this configuration; committing the workflow alone does not establish authorization.

## License

MIT; see [LICENSE](<LICENSE>).
