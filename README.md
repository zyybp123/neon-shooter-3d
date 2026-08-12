# 霓虹射手 Neon Shooter 3D

浏览器可玩的第三人称 3D 射击小游戏。纯静态文件，Three.js r160（unpkg CDN），零构建，可直接部署到 GitHub Pages 或 Vercel。

## 打开方式

本地任意静态服务器均可：

```bash
cd neon-shooter-3d
python3 -m http.server 8080
```

浏览器打开 `http://127.0.0.1:8080/`（需要网络以加载 CDN 上的 Three.js）。

也可部署整个文件夹到 GitHub Pages / Vercel。路径均为相对路径，放在子目录（如 `username.github.io/neon-shooter-3d/`）也能正常工作。

## 操作

| 按键 | 功能 |
|------|------|
| W A S D | 移动 |
| 鼠标 | 视角 / 瞄准 |
| 左键 | 射击 |
| 空格 | 跳跃 |
| R | 换弹 |
| Esc | 暂停 / 继续 |

点击画面锁定鼠标指针。

## 场景

1. **霓虹天台** — 赛博都市天台巷战  
2. **沙漠遗迹** — 废墟沙丘狙击战  
3. **冰原基地** — 极地工业据点突袭  

通关后解锁下一关（进度保存在 `localStorage`）。

## 结构

```
neon-shooter-3d/
  index.html
  css/style.css
  js/game.js
  README.md
```

## GitHub Pages 说明

- 使用相对路径（`css/style.css`、`js/game.js`），无 `base` 路径问题。
- Three.js 从 unpkg CDN 加载，仓库访客需能访问外网 CDN。
- 若仓库是 project site，把本目录内容放到 `docs/` 或对应分支根目录即可。
