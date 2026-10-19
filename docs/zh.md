# DSH 侧栏余额栏

[English](<../README.md>) | 中文

社区 desktop 插件 `dsh-balance-bar`（非 DeepSeek 官方出品），兼容 DSH 0.2.0-rc.2 与 0.2.1-rc.2。在原生 `sidebar.footer.action` 插槽添加常驻充值余额栏，位于现有账号入口上方。不替换账号入口、不修改核心、不注入定位 DOM、不启动额外服务。

## 行为

- 使用 Host `deepseekAccount.getBalance()`，复用当前登录，不读取或向前端传递凭证。
- Client 每 10 秒读取；Host 按需查询上游，最短间隔 30 秒，合并并发请求。隐藏页面暂停读取，回到窗口补检查（仍遵守缓存间隔）。不是服务端实时推送。点击余额栏使用原生按钮同款 `globalThis.dshPlatform.open('usage', bounds)` 桥接，在 DSH 内嵌官方用量页，不打开外部浏览器。插件提供返回按钮、视口尺寸同步与关闭清理；凭证仍由原生桥接管理。桌面桥接不可用或已退出账号时禁用入口。该桥接依赖当前桌面版本，升级时需要复验。
- 充值与赠送余额不相加；主栏显示充值余额，悬浮说明显示赠送余额和更新时间。空钱包显示 `—`，不会伪造零余额。
- Host 监听账号变化并清空缓存，以代际校验丢弃切换账号前的在途响应。前端最迟下一次成功读取时同步退出状态。网络失败清空前端金额，Host 上游失败保留旧金额并明确显示“过期”。
- 折叠侧栏隐藏余额栏；原账号入口保持可点击。所有请求、订阅、定时器、样式和注册跟随插件卸载清理。上游服务不接受取消参数，已开始请求只能在结束后丢弃结果。
- 本机路由 `/myspace-balance-bar/api` 限制 loopback、合法 Host、同源 Origin/Fetch Metadata 和自定义请求头；只支持本机浏览器，不提供 CORS。

## 开发与安装

在 DSH 插件管理器中安装 npm 包 `dsh-balance-bar`，无需配置 API Key，使用 DSH 当前登录的官方账号。仅支持 desktop profile；不要安装到 Web profile。

无需构建，原生 ModuleLoader Client 随包分发。开发时可安装 `link:/absolute/path/to/dsh-balance-bar`。禁用 bundle 即移除余额栏。升级后建议重启 DSH，避免 Host 模块缓存仍执行旧代码。

旧版本地包 `myspace-dsh-balance-bar` 必须先禁用或卸载，再安装本包；不要同时启用两者（共用路由与插槽标识）。

源码与问题反馈：https://github.com/fegnze/dsh-balance-bar 。

```sh
npm test
node --check src/client.js
```

验证覆盖余额缓存、并发合并、失败状态、退出与切换账号、卸载丢弃在途响应及请求来源校验。已在 DSH 0.2.0-rc.2 桌面验证余额栏与内嵌官方用量页；居中加载动画通过代码检查，尚未单独捕获实机加载阶段。实际账号退出使用隔离测试覆盖，不会在验收中退出用户登录。

## 限制

- 余额定时查询而非实时推送；官方用量页统计可能存在延迟。
- 原生内嵌页使用当前桌面版本桥接；不支持普通浏览器中的页面跳转。
- 加载中仅显示居中转圈，无说明文字；系统减少动态效果偏好下不旋转。
- 本插件不采集账户凭证、不上传余额、不提供充值操作。

## 可信发布

`.github/workflows/publish.yml` 使用 GitHub Actions OIDC 发布，无需保存 npm Token。在 `main` 上手动触发，将已审核的完整提交 SHA 填入 `expected_sha`。`dry_run` 默认 true，仅在批准发布新版本时设为 false；提交 SHA 不匹配时工作流拒绝发布。

npm 包设置中的 Trusted Publisher 必须配置：GitHub Actions、组织/用户 `fegnze`、仓库 `dsh-balance-bar`、工作流 `publish.yml`，Environment 留空。配置需要 npm 账号持有人完成二步验证；仅提交工作流不代表授权已经生效。

## License

MIT，见 LICENSE。
