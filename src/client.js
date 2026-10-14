window.__ModuleLoader__.load({ id: 'dsh-balance-bar', factory: require => {
  const React = require('react'), h = React.createElement;
  const money = items => items?.length ? items.map(w => `${w.currency === 'CNY' ? '¥' : 'US$'}${Number(w.balance).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' / ') : '—';
  const { createPortal } = require('react-dom');
  function UsagePage({ close }) {
    const viewport = React.useRef(null), back = React.useRef(null), layer = React.useRef(null);
    const [failed, setFailed] = React.useState(false);
    const [loaded, setLoaded] = React.useState(false);
    React.useEffect(() => {
      const bridge = globalThis.dshPlatform;
      let disposed = false;
      const previousFocus = document.activeElement;
      const background = [...document.body.children].filter(el => el instanceof HTMLElement && el !== layer.current).map(el => [el, el.inert]);
      background.forEach(([el]) => { el.inert = true; });
      back.current?.focus();
      const bounds = () => { const r = viewport.current.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
      const fail = () => { if (!disposed) setFailed(true); };
      bridge.open('usage', bounds()).then(() => { if (!disposed) setLoaded(true); }, fail);
      const observer = new ResizeObserver(() => bridge.setBounds(bounds()).catch(fail));
      observer.observe(viewport.current);
      const key = event => { if (event.key === 'Escape') close(); };
      window.addEventListener('keydown', key);
      return () => {
        disposed = true; observer.disconnect(); window.removeEventListener('keydown', key);
        bridge.close().catch(() => {});
        background.forEach(([el, inert]) => { el.inert = inert; });
        if (previousFocus?.isConnected) previousFocus.focus();
      };
    }, []);
    return createPortal(h('div', { ref: layer, role: 'dialog', 'aria-modal': true, 'aria-label': '官方查询用量', style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--dsw-alias-bg-base)', display: 'flex', flexDirection: 'column' } },
      h('header', { style: { height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: 96 } }, h('button', { ref: back, type: 'button', onClick: close, style: { font: 'inherit', color: 'var(--dsw-alias-label-primary)', background: 'transparent', border: 0, cursor: 'pointer', padding: 12 } }, '‹ 返回 DSH')),
      h('div', { ref: viewport, 'aria-busy': !loaded && !failed, style: { flex: 1, minHeight: 0, position: 'relative', color: 'var(--dsw-alias-label-secondary)' } }, failed ? h('div', { className: 'myspace-usage-status', role: 'alert' }, '加载失败') : !loaded ? h('div', { className: 'myspace-usage-status', role: 'status', 'aria-label': '加载中' }, h('span', { className: 'myspace-usage-spinner', 'aria-hidden': true })) : null)), document.body);
  }
  function apply(ctx) {
    function BalanceBar({ wide }) {
      const [data, setData] = React.useState({ status: 'loading' });
      const [busy, setBusy] = React.useState(false);
      const [usageOpen, setUsageOpen] = React.useState(false);
      React.useEffect(() => {
        let stopped = false, pending = false, last = 0;
        const controller = new AbortController();
        const load = async () => {
          if (pending || document.hidden || Date.now() - last < 3000) return;
          pending = true; last = Date.now(); setBusy(true);
          try {
            const res = await fetch('/myspace-balance-bar/api', { headers: { 'X-DSH-Balance-Bar': '1' }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
            if (!res.ok) throw new Error('unavailable');
            const next = await res.json();
            if (!stopped) setData(next);
          } catch { if (!stopped) setData({ status: 'failed' }); }
          finally { pending = false; if (!stopped) setBusy(false); }
        };
        void load();
        const timer = setInterval(load, 10000);
        window.addEventListener('focus', load);
        document.addEventListener('visibilitychange', load);
        return () => { stopped = true; controller.abort(); clearInterval(timer); window.removeEventListener('focus', load); document.removeEventListener('visibilitychange', load); };
      }, []);
      if (!wide) return null;
      const stale = data.status === 'failed' || (data.updatedAt && Date.now() - data.updatedAt > 90000);
      const value = data.status === 'signed-out' ? '未登录' : data.wallets?.length ? money(data.wallets) : data.status === 'failed' ? '获取失败' : data.status === 'ready' ? '—' : '查询中…';
      const title = `充值余额：${value}${stale ? '（数据过期）' : ''}\n赠送余额：${money(data.bonuses)}\n${data.updatedAt ? `更新于 ${new Date(data.updatedAt).toLocaleTimeString()}` : '尚无有效数据'}\n每 30 秒更新；点击打开官方查询用量页面`;
      return h(React.Fragment, null, h('button', { type: 'button', className: 'myspace-balance-bar', title, 'aria-label': title, 'aria-busy': busy, disabled: !globalThis.dshPlatform || data.status === 'signed-out', onClick: () => setUsageOpen(true) },
        h('span', null, '充值余额'), h('strong', null, value), stale ? h('small', null, '过期') : null), usageOpen ? h(UsagePage, { close: () => setUsageOpen(false) }) : null);
    }
    ctx.effect(() => {
      const style = document.createElement('style');
      style.textContent = `.myspace-balance-bar{appearance:none;text-decoration:none;display:flex;align-items:center;gap:8px;width:100%;min-width:0;box-sizing:border-box;margin:0;padding:5px 12px 2px;border:0;border-radius:0;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;line-height:18px;cursor:pointer;box-shadow:none}.myspace-balance-bar strong{margin-left:auto;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;font-variant-numeric:tabular-nums}.myspace-balance-bar small{color:var(--dsw-alias-state-warn-primary);font-size:10px}.myspace-balance-bar:hover{background:transparent;color:var(--dsw-alias-label-primary)}.myspace-balance-bar:hover strong{color:var(--dsw-alias-label-primary)}.myspace-balance-bar:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px;border-radius:6px}`;
      style.textContent += `.myspace-usage-status{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}.myspace-usage-spinner{display:block;width:28px;height:28px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-label-secondary);border-radius:50%;animation:myspace-usage-spin .85s linear infinite}@keyframes myspace-usage-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.myspace-usage-spinner{animation:none}}`;
      document.head.appendChild(style);
      return () => style.remove();
    });
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'myspace-balance-bar', order: 100, label: '充值余额' }, BalanceBar));
  }
  return { inject: ['slots'], apply };
} });
