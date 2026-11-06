# 草地喷气 · 简化版 R21

只保留吃东西、体型成长、进入发射区起飞和落地再来的循环。场景是草地大厅与一条彩色跑道。

人物采用方块比例、简单笑脸与黑色服装。进食时肚子和臀部连同衣服以连续曲面逐渐变圆，头和脚保持尺寸；能量越多，飞行距离越远。动作包含抬手进食、交替迈步、起飞前蓄力、约 0.1 秒短促蓄力后大团尾气爆发、身体前倾与收腿飞行、落地缓冲和恢复站立。

## 启动

需要 Node.js 20 或更新版本。在解压后的项目目录运行：

```sh
npm ci
npm start
```

打开 http://localhost:5180/ 。手机尺寸交互检查页是 http://localhost:5180/mobile-review.html 。人物动作检查页是 http://localhost:5180/character-review.html 。可用 `PORT` 环境变量改端口。

页面适合竖屏。桌面使用 WASD / 方向键移动，空格吃东西；触屏使用左下摇杆，按住“吃东西”。点击“去发射区”自动走过去，也可以自己走进黄色区域。到达后立即起飞，无报名、无匹配等待。拖动画面旋转视角。

同一个服务地址、同一个房间内的真实玩家共享大厅。多人在线时显示每个人的实时飞行进度，各自独立起飞，不用等待别人。可在地址后添加 `?room=ABCD` 指定房间（4–8 位英文字母或数字）。手机和朋友需要访问运行服务器的可达网络地址；`localhost` 仅指打开网页的这台设备。

## 文件与导入

- `dist/`：完整网页、人物、场景、效果和本地 Three.js 依赖。
- `server.mjs`：HTTP、WebSocket、存档与飞行结算服务。
- `dist/character.js`：可编辑的程序化人物模型与动作，不是 GLB 文件。
- `verify-character.mjs` / `verify-launch.mjs` / `verify-network.mjs`：人物与联机验证。
- `verification/`：本次自动检查结果和手动试玩记录。

在 Loopit 中导入时需要保留或适配 Node.js + WebSocket 后端。仅托管 `dist/` 静态文件不能完成进食、存档和联机。此包不是 Roblox Studio 工程，不依赖 Roblox 运行时。

存档写入本机 `.save/`；发行包不包含玩家存档。此版本使用独立的本地身份键。人物、场景为此项目编写，Three.js 许可证见 `dist/vendor/THREE-LICENSE.txt`。

## 验证

```sh
npm run check
npm run test:character
npm run test:launch
npm run test:network
```

已在浏览器中试玩开始、持续进食、自动走入发射区、起飞、落地、返回及两个客户端实时进度。人物自动检查覆盖最大体型、脚底接地、抬手进食和飞行恢复。390 × 844 的嵌入式手机布局已验证长按进食、摇杆、发射与重试；尚未在实体手机上验证。
