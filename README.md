<div align="center">

# 🐾 AI Pet Studio · Web

**把宠物照片变成有趣的图片与短视频。**

选择创作模板、上传照片、提交生成任务，再在作品页查看结果。

[在线体验](https://ai-pet-studio-web.yangf999212.workers.dev/) ·
[Web 源码](https://github.com/yf9182/AIPetStudio-Web) ·
[后端源码](https://github.com/yf9182/AIPetStudio-Backend) ·
[iOS 客户端](https://github.com/yf9182/AIPetStudio--iOS)

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)

</div>

## ✨ 这个项目是什么

这是一个围绕宠物趣味创作的全栈 Web 产品。用户可以浏览模板、上传宠物照片，发起图片或视频生成任务，并查看、下载生成结果。登录、积分与支付也集成在 Web 流程中。

## 🌟 主要功能

| 创作 | 账户与作品 | 购买 |
| --- | --- | --- |
| 浏览分类模板 | Google 登录或邮箱登录 | Stripe 积分包与订阅 |
| 上传照片并提交图片 / 视频任务 | 查看任务状态与生成结果 | Stripe 客户门户管理订阅 |
| 查看、下载近期作品 | 查看积分余额与账户设置 | 服务端校验购买回调并入账 |

## 🔄 一次创作如何完成

~~~mermaid
flowchart LR
    A[浏览模板] --> B[上传宠物照片]
    B --> C[Web API 校验并创建任务]
    C --> D[AI Pet Studio Worker]
    D --> E[D1 任务与积分记录]
    D --> F[R2 输入文件]
    D --> G[Vidu 生成]
    G --> H[作品页查看结果]
    A -.读取模板目录.-> I[Material Hub]
~~~

Web 端把登录会话与服务端 API 放在同源 Next.js 路由中；模板目录由服务端代理读取，素材 API Key 不下发到浏览器。生成任务、积分流水和文件处理由独立的 Cloudflare Worker 后端负责。

## 🧰 技术选型

- **界面与路由：** Next.js App Router、React、TypeScript、Tailwind CSS
- **登录：** Auth.js，支持 Google OAuth 与邮箱魔法链接
- **服务端部署：** Cloudflare Workers，通过 OpenNext 适配 Next.js
- **业务集成：** AI Pet Studio Worker、Material Hub、Stripe

## 🚀 本地运行

需要 Node.js 及 npm。

~~~bash
npm install
cp .env.example .env.local
npm run dev
~~~

本地启动后访问 localhost:3000。至少需要配置 AUTH_SECRET 和只读的 MATERIAL_HUB_API_KEY 才能完成登录会话与模板目录读取。Google、邮箱和 Stripe 对应的变量按需配置，变量说明见 [.env.example](.env.example)。

常用检查：

~~~bash
npm run typecheck
npm run lint
npm run build
~~~

## 🗂️ 相关仓库

- [Cloudflare Worker 后端](https://github.com/yf9182/AIPetStudio-Backend)：匿名会话、任务、积分、文件和购买回调
- [iOS 客户端](https://github.com/yf9182/AIPetStudio--iOS)：原生 iOS 创作体验
- [Material Hub](https://github.com/yf9182/material-hub)：模板与素材目录管理

## ℹ️ 当前边界

Web 使用登录账号，iOS 使用设备会话；目前两端账号与积分钱包尚未打通。项目中的条款与隐私页仍需产品运营补充正式文本。

<details>
<summary>深入了解 Web 架构与实现细节</summary>

原 README 中关于服务端目录代理、身份派生、支付入账、媒体代理与部署配置的详细说明已保留在 [docs/architecture-reference.md](docs/architecture-reference.md)。

</details>
