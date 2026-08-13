# 霓虹射手 Neon Shooter 3D

浏览器可玩的第三人称 3D 射击小游戏。纯静态文件，Three.js r160（unpkg CDN），零构建，可直接部署到 GitHub Pages 或 Vercel。

角色使用 **GLTF 人形模型**（Mixamo Soldier / X Bot），手持 **Kenney Blaster（CC0）** 武器，过肩第三人称可见全身与枪械。

## 打开方式

本地任意静态服务器均可：

```bash
cd neon-shooter-3d
python3 -m http.server 8080
```

浏览器打开 `http://127.0.0.1:8080/`（需要网络以加载 CDN 上的 Three.js）。

也可部署整个文件夹到 GitHub Pages / Vercel。路径均为相对路径，放在子目录也能正常工作。

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

1. **霓虹天台** — 赛博都市天台巷战（霓虹灯、广告牌、屋顶设施）
2. **沙漠遗迹** — 废墟沙丘狙击战（沙丘、石柱、拱门）
3. **冰原基地** — 极地工业据点突袭（机库、天线、冰面）

通关后解锁下一关（进度保存在 `localStorage`）。

## 结构

```
neon-shooter-3d/
  index.html
  css/style.css
  js/game.js
  assets/
    CREDITS.md
    LICENSE-kenney-blaster.txt
    models/          # Soldier.glb, Xbot.glb, crates
    weapons/         # Kenney blaster GLBs
  README.md
```

## 资源与许可

详见 [`assets/CREDITS.md`](assets/CREDITS.md)。

- **Soldier.glb / Xbot.glb**：来自 three.js examples（Mixamo 绑定），本地打包，不热链。
- **Blaster / crates**：Kenney Blaster Kit 2.1，**CC0**。

若 GLTF 加载失败，游戏会回退到更高比例的程序化人形 + 步枪。

## 验证枪械附着

1. 启动本地服务器并打开游戏，进入任一关。
2. 第三人称应能看到玩家右手握着明显的爆破枪 / 步枪模型。
3. 射击时枪口位置应有枪口火花（muzzle 节点挂在武器前端）。
4. 浏览器控制台应出现：`[NeonShooter] Player weapon attached; muzzle OK`。

## GitHub Pages 说明

- 使用相对路径（`css/`、`js/`、`assets/`），无 `base` 路径问题。
- Three.js 从 unpkg CDN 加载；模型在仓库 `assets/` 内。
- 若仓库是 project site，把本目录内容放到 `docs/` 或对应分支根目录即可。

## 相对 AAA 的限制（诚实说明）

- 手持姿态为骨骼叠加近似瞄准，并非完整 IK / 专用瞄准动画。
- 角色来自 Mixamo 示例装，不是定制 AAA 扫描网格 / 面捕。
- 场景为程序化几何增强，非手制关卡美术。
- 无后坐力动画状态机、弹壳抛射、复杂材质（PBR 贴图集有限）。
