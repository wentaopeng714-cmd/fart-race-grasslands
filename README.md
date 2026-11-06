# 屁力社区运动场 · R18

手机竖屏 3D 游戏。共享联机大厅，单人喷气距离挑战，包含原创人物、场景、动作与界面。

R18 更新：身体绕髋前扑、双腿后收；臀部爆发气团与滑翔尾气；落地屈膝承重，再恢复站立。

## 下载与运行

下载 Releases 中的 `fart-race-grasslands-r18.zip`，解压后进入文件夹。安装 Node.js（建议 22 或更新版本），执行：

```sh
npm install
npm start
```

浏览器打开 <http://localhost:5178/>。手机与运行服务器的电脑连接同一网络，用电脑的局域网 IP 和端口 5178 访问。外网多人游玩需要另行部署 Node.js / WebSocket 服务。

## 操作

- 摇杆或 WASD 移动；拖动空白场景转镜头。
- 吃东西积累能量，去喷气开始个人挑战。
- 飞行中点击底部喷气按钮，或按空格 / E；金色时机增加距离。
- 飞行结算获得金币，可购买食物、装备与宠物，并再次挑战。
- 两个自动按钮常驻，支持自动进食和自动挑战。

## 包含内容

- `dist/`：完整前端、人物与场景代码、Three.js 本地依赖。
- `server.mjs`：联机房间、独立挑战、经济与存档。
- `dist/character-review.html`：与游戏共用资产的角色动作检查页。
- `verify-*.mjs` 和 `qa/`：验证脚本与报告。

存档运行时保存在 `.save/`，下载包不含现有玩家存档、账号或令牌。人物与场景通过代码生成；本包没有单独的 GLB / FBX 文件。本项目需要 Node.js 后端，不是无需改造即可导入 Loopit 的纯静态包。

## 验证

```sh
npm run check
npm run test:feel
npm run test:network
```

已检查桌面与 390×844 浏览器尺寸的交互、单人飞行与奖励流程；未进行实体手机测试。

Three.js 与 ws 使用 MIT 许可；Three.js 许可见 `dist/vendor/THREE-LICENSE.txt`。
