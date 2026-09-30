# AI Pet Studio Web

AI Pet Studio 的 Web 端。上传一张宠物照片，套用模板生成图生图效果图或图生视频短片。

只做模板能力（图生图 / 图生视频），**不含**工作站、workflow、时间线剪辑等能力。

- 素材目录：`material-hub`（服务端代理，浏览器不接触 API Key）
- 账号、积分、任务：`AIPetStudio-Backend`（Cloudflare Worker）
- 支付：Stripe Checkout
- 部署：Cloudflare Workers（通过 `@opennextjs/cloudflare`）

## 技术栈

| 项 | 选择 | 说明 |
| --- | --- | --- |
| 框架 | Next.js 16.3.7（App Router） | 与 `material-hub` 同栈。**未使用 15.x**：15.5.26 内置的 postcss 存在高危漏洞且 15.x 内无修复版本，只有 16.3.7 修复；同时 `@opennextjs/cloudflare` 的 peer 要求是 `>=15.5.26 <16 \|\| >=16.3.6` |
| 样式 | Tailwind CSS v4 | 设计 token 用 `@theme` 定义在 `src/app/globals.css` |
| 登录 | Auth.js v5（`next-auth@beta`） | Google OAuth + 邮箱魔法链接，JWT 会话，无需数据库 |
| 支付 | Stripe | Checkout Session + Billing Portal |
| 部署 | Cloudflare Workers | `@opennextjs/cloudflare` |

## 设计系统

视觉完全参照给定的参考站（深色主题），所有数值都是从该站点实测出来的，不是估计值：

```text
页面底色      #000000
标题色        #FAFAFA
弱化文字      #737373 / rgba(255,255,255,0.6)
卡片面        rgba(255,255,255,0.03)  圆角 8px
面板面        rgba(255,255,255,0.04)  圆角 16px
强调色        #0075FF
内容宽度      1040px 容器 / 992px 内容（24px 内边距）
字体          Inter
字号          h1 52/700/-2.5px · h2 40/700/-2px · 卡片标题 14/600/-0.14px
按钮          全圆角药丸，主按钮 #FAFAFA 底 + 黑字，尺寸 32 / 40px
```

Token 定义见 `src/app/globals.css`，基础组件见 `src/components/ui/`。

**与参考站的一处有意偏离**：参考站的定价区是「月/年」二选一切换的 4 档方案；本项目的后端已有固定积分额度的是周付 / 月付 / 年付三档，所以改为三档并排展示，而不是把某一档藏进切换器里。

## 架构要点

### 1. 素材中心走服务端代理，不是浏览器直连

`material-hub` **完全没有 CORS 实现**（没有 OPTIONS 分支、没有 middleware），浏览器无法直连；同时它的产品 API Key 属于机密，不能进入前端产物。

因此所有目录请求都经过 `/api/catalog`，在服务端携带 `X-API-Key` 调用，浏览器只访问同源接口。解析规则对齐 iOS 端 `MaterialHubClient.swift`，保证网页与 App 展示同一批模板：

- 一级分类按 `code === "Nano_Banana"` 定位，二级分类不写死 ID
- 素材 `material_config` 是 `public_properties.material_config.value[0]` 里的 **JSON 字符串**
- 过滤 `listing_status != 0 && publish_status != 0`、`image_count === 1`、`prompt` 非空
- 封面回退顺序：`file_url` → `video_preview_file_id` → `original_file_id` → `thumbnail_file_id`
- `type=1` 前后对比、`type=2` 单效果图、其余按视频动图处理

### 2. 登录在 Web 层，后端零改动

后端**没有账号体系**，只有匿名设备会话：`POST /v1/session/bootstrap` 把调用方给的 `device_id` 变成一个稳定用户，且 `customer_id = "aipet_" + device_id`。这个字符串是钱包的唯一标识，所以它必须**稳定**（每次登录都指向同一个钱包）且**不可猜**（知道它就能花掉该钱包的积分）。

做法见 `src/lib/identity.ts`：

```text
device_id = "web_" + sha256("aipetstudio-web:" + accountId + ":" + AUTH_SECRET).slice(0, 40)
```

用 `AUTH_SECRET` 加盐，得到稳定且不可逆的标识，同时符合 RevenueCat 客户 ID 的字符集要求。**注意：轮换 `AUTH_SECRET` 会让所有 Web 账号与既有钱包断开。**

后端 JWT 只放在 Auth.js 加密会话里，**不会**进入 `/api/auth/session` 返回给浏览器的对象（见 `src/lib/auth.ts` 的 `session` 回调只暴露非机密字段）。读取方式封装在 `src/lib/auth-token.ts`，是唯一接触 `getToken` 的文件。

### 3. 生成价格与快照由服务端决定

浏览器只发送 `template_id` + `input_asset_ids` + `client_request_id`（`POST /api/worker/tasks`）。用于计费的 `material_snapshot` 由服务端**从自己的目录缓存重建**，而不是采信请求体——否则调用方可以改价或换掉 prompt。

后端固定计费：图生图 10 积分、图生视频 50 积分，与素材目录里的价格字段无关。

### 4. 私有媒体走同源代理

后端 `taskResponse` 把 `thumbnail_url` 指向 `{workerOrigin}/v1/media/{key}`，这是需要 Bearer token 的地址。`src/lib/tasks.ts` 会把这类地址改写成 `/api/media?key=...`，由服务端带上 token 转发。生成成功的结果是 Vidu 直链，不需要代理。

归属校验由 Worker 自己完成（它会拒绝任何不以 `users/<当前用户 id>/` 开头的 key），Web 层不重复实现该规则，避免两处规则漂移。

### 5. 支付

后端 RevenueCat webhook 里有硬判断 `event.source !== "in_app_purchase"` → 直接丢弃，所以**网页端购买在改造前无法入账**。现在由后端新增的 `POST /v1/webhooks/stripe` 记账，写入同一个 RevenueCat 虚拟货币与同一张 `credit_ledger`。

- 积分额度与后端 `REVENUECAT_PRODUCTS` 完全一致：积分包 100 / 350 / 900 / 2200，订阅周付 300、月付 1200、年付 10000
- 价格**不在代码里写死**：页面从 Stripe 读回 Price 金额，避免展示价与实收价不一致；未配置的价格会显示「待配置」并禁用按钮
- 订阅走 `invoice.paid` 记账，一次性积分包走 `checkout.session.completed`（`mode=payment`），避免首期发票被重复计一次
- Web 端不存数据库，Stripe 客户通过邮箱检索复用（`customers.search`），并在 metadata 打上 `aipet_customer_id`

## 本地运行

```bash
npm install
cp .env.example .env.local   # 填入下面的变量
npm run dev
```

至少需要配置 `AUTH_SECRET`、`MATERIAL_HUB_API_KEY` 才能看到模板库。Google 登录需要 `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`；邮箱登录需要 `AUTH_RESEND_KEY`；支付需要 `STRIPE_SECRET_KEY` 与各价格 ID。缺失的能力会在页面上明确提示，不会静默失败。

`AUTH_SECRET` 用 `openssl rand -base64 32` 生成。

### 环境变量

服务端专用（**不要**加 `NEXT_PUBLIC_` 前缀）：

| 变量 | 用途 |
| --- | --- |
| `AUTH_SECRET` | Auth.js 会话加密，同时用于派生后端 device id |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth |
| `AUTH_RESEND_KEY` / `EMAIL_FROM` | 邮箱魔法链接（Resend HTTP API） |
| `MATERIAL_HUB_BASE_URL` / `MATERIAL_HUB_API_KEY` / `MATERIAL_HUB_PID` / `MATERIAL_HUB_CHANNEL` / `MATERIAL_HUB_SOURCE` | 素材中心只读目录 |
| `WORKER_BASE_URL` | 后端 Worker 地址 |
| `STRIPE_SECRET_KEY` | Stripe Checkout 与 Billing Portal |
| `STRIPE_PRICE_CREDITS_*` / `STRIPE_PRICE_SUB_*` | 各商品的 Stripe 价格 ID |

公开变量：`NEXT_PUBLIC_SITE_URL`。

> 邮箱登录没有使用 Auth.js 自带的 email provider：它基于 nodemailer（裸 SMTP），在 Cloudflare Workers 上无法运行。这里用 Auth.js 的 Resend provider（走 HTTP API）并替换成自有品牌邮件模板。

## 部署到 Cloudflare Workers

```bash
npx wrangler secret put AUTH_SECRET
npx wrangler secret put AUTH_GOOGLE_ID
npx wrangler secret put AUTH_GOOGLE_SECRET
npx wrangler secret put AUTH_RESEND_KEY
npx wrangler secret put EMAIL_FROM
npx wrangler secret put MATERIAL_HUB_API_KEY
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_PRICE_CREDITS_100
# ……其余价格 ID 同理

npm run deploy     # opennextjs-cloudflare build && deploy
```

非机密的变量（素材中心地址、PID、后端地址）已经写在 `wrangler.jsonc` 的 `vars` 里。

部署后需要在 Stripe 后台把 webhook 指向**后端 Worker** 的 `POST /v1/webhooks/stripe`，订阅 `checkout.session.completed` 与 `invoice.paid`，并把签名密钥设置为后端的 `STRIPE_WEBHOOK_SECRET`。

## 项目结构

```text
src/
├─ app/
│  ├─ page.tsx                     首页：Hero + 模板库 + 三步说明 + 定价 + FAQ
│  ├─ templates/[id]/              模板详情与生成入口
│  ├─ tasks/                       我的作品；tasks/[id] 为进度与结果
│  ├─ points/                      积分中心：余额、积分包、流水
│  ├─ pricing/                     订阅定价
│  ├─ account/                     账号设置、订阅管理、删除账号
│  ├─ login/                       登录与「查收邮件」
│  └─ api/
│     ├─ catalog/                  素材中心代理
│     ├─ media/                    私有媒体同源代理
│     ├─ wallet/                   积分余额
│     ├─ worker/{upload,tasks,account}/   后端业务代理
│     ├─ billing/{checkout,portal}/       Stripe
│     └─ auth/[...nextauth]/        Auth.js
├─ components/  ui / site / catalog / generate / tasks / billing / marketing
└─ lib/         material-hub · worker · auth · identity · worker-session · billing · tasks
```

## 已知限制

- **网页端与 iOS App 的账号不互通**。App 用匿名设备标识，Web 用登录账号，两者的钱包是独立的。要打通需要后端引入真正的账号体系并把两端映射到同一个 `customer_id`。
- **「再生成一次」依赖浏览器会话**。后端在任务响应里刻意不返回 `input_asset_ids` 与 `material_snapshot`，所以参考图只保存在创建任务的那个浏览器标签的 `sessionStorage` 里；换设备或换标签后需要重新上传。
- **退款不会自动扣回积分**。Stripe 的 `charge.refunded` 会被记录但不动钱包，本版本按人工处理。
- **后端 App Check 目前是 iOS 专用**。`APP_CHECK_APP_ID` 固定为 iOS 应用，一旦把 `APP_ATTEST_MODE` 切成 `required`，浏览器将无法通过校验。当前是 `disabled`，所以不受影响。
- **条款与隐私页是占位文本**，上线前必须由运营方补充正式内容。
