import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBalanceReader, wallets, trusted } from '../src/host.mjs';
const ready = { status: 'ready', value: [{ currency: 'CNY', balance: '8.43' }], bonusWallets: [] };
function setup() {
  let time = 100000, calls = 0, result = ready, state = 'credential-stored';
  const account = { getState: async () => ({ status: state }), getBalance: async () => { calls++; if (result instanceof Error) throw result; return result; } };
  const reader = createBalanceReader(account, () => time);
  return { reader, account, calls: () => calls, advance: () => { time += 30001; }, result: v => { result = v; }, state: v => { state = v; } };
}
test('successful balance cached for 30 seconds with single flight', async () => {
  const s = setup(); const results = await Promise.all([s.reader.read({}), s.reader.read({})]);
  assert.equal(results[0].wallets[0].balance, '8.43'); assert.equal(s.calls(), 1);
  await s.reader.read({}); assert.equal(s.calls(), 1);
  s.advance(); await s.reader.read({}); assert.equal(s.calls(), 2);
});
test('failed refresh retains explicitly stale data, never zero', async () => {
  const s = setup(); await s.reader.read({}); s.advance(); s.result(new Error('secret upstream text'));
  const r = await s.reader.read({}); assert.equal(r.status, 'failed'); assert.equal(r.wallets[0].balance, '8.43'); assert.ok(!JSON.stringify(r).includes('secret'));
});
test('signed out clears cached amounts without querying balance', async () => {
  const s = setup(); await s.reader.read({}); s.state('signed-out');
  assert.deepEqual((await s.reader.read({})).wallets, []); assert.equal(s.calls(), 1);
});
test('account change discards in-flight previous identity', async () => {
  const s = setup(); let resolve;
  s.account.getBalance = () => new Promise(r => { resolve = r; });
  const pending = s.reader.read({}); await Promise.resolve();
  s.reader.invalidate({ status: 'signed-out' }); resolve(ready);
  const r = await pending; assert.equal(r.status, 'signed-out'); assert.deepEqual(r.wallets, []);
});
test('dispose discards pending response', async () => {
  const s = setup(); let resolve; s.account.getBalance = () => new Promise(r => { resolve = r; });
  const pending = s.reader.read({}); await Promise.resolve(); s.reader.dispose(); resolve(ready);
  assert.equal((await pending).status, 'unavailable');
});
test('wallet whitelist excludes malformed values and extra fields', () => {
  assert.deepEqual(wallets([{ currency: 'CNY', balance: '-1.00', token: 'secret' }, { currency: 'USD', balance: 'NaN' }, { currency: 'EUR', balance: '2' }]), [{ currency: 'CNY', balance: '-1.00' }]);
});
test('route permits local same origin custom header only', () => {
  const req = { socket: { remoteAddress: '127.0.0.1' }, headers: { host: '127.0.0.1:19387', origin: 'http://127.0.0.1:19387', 'x-dsh-balance-bar': '1' } };
  assert.equal(trusted(req), true);
  for (const patch of [{ origin: 'https://evil.test' }, { host: 'evil.test' }, { 'x-dsh-balance-bar': undefined }, { 'sec-fetch-site': 'cross-site' }]) assert.equal(trusted({ ...req, headers: { ...req.headers, ...patch } }), false);
  assert.equal(trusted({ ...req, socket: { remoteAddress: '10.0.0.2' } }), false);
});
