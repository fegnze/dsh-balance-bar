export const inject = ['deepseekAccount', 'webServer'];
export function trusted(req) {
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress)) return false;
  try {
    const host = new URL(`http://${req.headers.host}`);
    return ['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname)
      && (!req.headers.origin || new URL(req.headers.origin).host === host.host)
      && (!req.headers['sec-fetch-site'] || req.headers['sec-fetch-site'] === 'same-origin')
      && req.headers['x-dsh-balance-bar'] === '1';
  } catch { return false; }
}
export function wallets(items) {
  return Array.isArray(items) ? items.filter(w => ['CNY', 'USD'].includes(w?.currency) && typeof w.balance === 'string' && /^-?\d+(\.\d+)?$/.test(w.balance)).map(({ currency, balance }) => ({ currency, balance })) : [];
}
export function createBalanceReader(account, now = Date.now) {
  let generation = 0, stopped = false, pending, lastAttempt = -Infinity;
  let snapshot = { status: 'loading', wallets: [], bonuses: [], updatedAt: null };
  return {
    invalidate(state) {
      generation++;
      lastAttempt = -Infinity;
      snapshot = { status: state.status === 'signed-out' ? 'signed-out' : 'loading', wallets: [], bonuses: [], updatedAt: null };
    },
    async read(client) {
      if (stopped) return snapshot;
      if (pending) { await pending; return snapshot; }
      const epoch = generation;
      pending = (async () => {
        try {
          const state = await account.getState();
          if (epoch !== generation || stopped) return;
          if (state.status === 'signed-out') { this.invalidate(state); return; }
          if (now() - lastAttempt < 30000) return;
          lastAttempt = now();
          const result = await account.getBalance(client);
          if (epoch !== generation || stopped) return;
          if (result === null) { snapshot = { status: 'loading', wallets: [], bonuses: [], updatedAt: null }; return; }
          if (result.status !== 'ready') throw new Error('balance-unavailable');
          snapshot = { status: 'ready', wallets: wallets(result.value), bonuses: wallets(result.bonusWallets), updatedAt: now() };
        } catch {
          if (epoch === generation && !stopped) snapshot = { ...snapshot, status: 'failed' };
        }
      })();
      try { await pending; } finally { pending = undefined; }
      return snapshot;
    },
    dispose() { stopped = true; generation++; snapshot = { status: 'unavailable', wallets: [], bonuses: [], updatedAt: null }; }
  };
}
export function apply(ctx) {
  ctx.effect(() => {
    const reader = createBalanceReader(ctx.deepseekAccount);
    const controller = new AbortController();
    void (async () => {
      try { for await (const state of ctx.deepseekAccount.watch(controller.signal)) reader.invalidate(state); }
      catch { if (!controller.signal.aborted) reader.invalidate({ status: 'credential-stored' }); }
    })();
    const disposeRoute = ctx.webServer.register({ kind: 'exact', path: '/myspace-balance-bar/api', handler: async (req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (!trusted(req)) { res.statusCode = 403; res.end('{}'); return; }
      if (req.method !== 'GET') { res.statusCode = 405; res.end('{}'); return; }
      const snapshot = await reader.read({ version: '0.2.0-rc.2', locale: 'zh-CN', timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60 });
      const state = await ctx.deepseekAccount.getState();
      let usageUrl;
      try {
        const url = new URL(state.links.usageUrl);
        if (url.protocol === 'https:' && !url.username && !url.password) usageUrl = url.href;
      } catch { /* Missing or invalid platform link: render without navigation. */ }
      res.end(JSON.stringify({ ...snapshot, usageUrl }));
    } });
    return () => { controller.abort(); reader.dispose(); disposeRoute(); };
  });
}
