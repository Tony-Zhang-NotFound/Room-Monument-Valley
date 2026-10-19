# Quiet Arles / 静谧的阿尔 — 艺术家的房间 01

本轮目标是一个可玩的美术样板：在既有旋转楼梯、错层平台和视角连接上，建立梵高卧室的颜色与生活物件身份。不是新增平面房间、谜题或精确复刻原画。原解法和相机方向优先，G2.5 HOLD 继续保留。

## 接续与回退

- 实际工作仓库：`/workspace/room-g2`，remote 为 `Tony-Zhang-NotFound/Room-Monument-Valley`。
- 工作分支：`art/quiet-arles`；改前提交：`4ab193c52490b9cdd5094f577e39a83eeafb9917`；本地回退分支：`checkpoint/pre-quiet-arles-20261019`。
- 接手时本地工作区干净，所有远程分支已检查，未发现其他已推送的 Quiet Arles 改造。无法查看用户电脑上未推送的 VS Code 文件，没有重置、覆盖或声称合并那些不可见工作。
- `main`、`g2.5-acceptance`、`g2-baseline` 与原始 `baseline/` 留存。此分支不改作品集文件、分支、remote 或环境配置。
- 冻结 HTML SHA256 仍为 `8e336fca344ebe9fc0a4e1b2f8dd681f34ddc25f4c70bf4d3ffbb88fb178fbab`；新单文件另行重建，没有覆盖冻结文件。

## 差距检查与实际改动

| 优先级 | 改前差距 | 实际处理 |
|---|---|---|
| P0 | 改造可能占用旋转包络、挡住落点或改变错觉 | 核心路线/状态文件不变；新增家具与玩家通道、支柱和旋转扫掠检查；原遮挡平面保留 |
| P0 | 新的模型可能吞掉点击、共享材质导致全房发光 | 装饰与交互分层；只看可见命中；目标门使用独占 emissive 材质 |
| P1 | 原场景只有通用建筑块，缺少卧室身份 | 黄床红被、绿窗、蓝紫墙、暖色地板、洗漱桌椅；床有床头/床尾/框腿/床垫/被褥/枕头 |
| P1 | 简单拼接墙块产生亮线 | 使用带真实窗洞的整体挤出墙；保持墙厚，避免横向拼接缝 |
| P1 | 支柱与门框抢夺床的黄色轮廓 | 保留其几何与用途，以奶油色并入建筑；黄色集中在床、家具与细框 |
| P2 | 生活细节为空 | 少量盆、壶、书与原创抽象画芯；不使用外部截图当贴图 |
| 性能 | 首版装饰增加 draw calls 与阴影成本 | 静态构件按材质合批、稳定时按需重绘、移动时更新阴影；拟合阴影相机并测量，不增加后处理系统 |

## 工程与坐标

引擎仍为 Three.js r170，Y 向上，单位沿用米。浏览器从 `index.html` 加载源码，`ROOM_G2_Play.html` 是同一图谱的无外部资源单文件。没有引入 Vite、框架、付费依赖、模型下载器或后端。

| 对象 | 位置 / 范围 | 与既有玩法的关系 |
|---|---|---|
| 黄床 | 中心 `[4.42,0,1.84]`，约宽 2.2、长 2.7、高 1.7 | 位于右侧地面，避开支柱，顶部低于原门前平台；四脚接地 |
| 桌与小物件 | `[-3.46,0,-2.19]` | 左后方，桌下留空，远离起点路径 |
| 椅子 | `[-3.31,0,-0.94]`，Y 旋转 0.18 | 靠近桌前，处于旋转半径之外 |
| 绿窗 | `[-1,3.75,-3.36]`；真实墙洞 x=-2.1..0.1、y=2.65..4.85 | 后墙分层框/扇/台，纯视觉，不能拦截点击 |
| 地板与底座 | 主范围 x=-4.5..6.3、z=-3.4..3.4；地板 y=0 | 少量低频板缝；底座底部与背景地面 y=-0.48 相接 |
| 旋转机关 | `M01/Rotator` 与原尺寸、枢轴一致 | 原 90° 旋转、2.73 半径和仅 S 点旋转的条件不变 |
| 视错觉屏风 | `TransitionMask` 的原平面、位置和角度不变 | 新绿色与薄木框；原 A/B 对齐与遮挡逻辑不变 |
| 出口 | 原 `GoalFrame` / `GoalDoor` 与 G 落点 | 分层框/门板/把手；无新增开门动作，胜利仍只改变发光反馈 |

S/T/F/G、A/B、C0/C1/C2、四个 turn、通行条件、路径采样、保存 schema 和 key 均不变。没有增加碰撞引擎或寻路器；角色继续沿已编写路线行走。资产配置中的 collision 字段是空间约束和验收代理说明，不冒充新增运行时物理能力。

## 资产调度与所有权

- 集中式色板、布局、构建函数、材质、灯光参数：`src/quiet-arles.mjs`。
- 完整清单（来源/父节点/变换/材质/复用/碰撞/拾取/阴影/状态/释放者）：[`quiet-arles-assets.json`](quiet-arles-assets.json)，由 `node scripts/quiet-arles-manifest.mjs` 生成。
- 保留源资产组和构件名称/包围盒；它们作为不可见源/空间代理。实际静态画面使用 `StaticArtBatch`，按材质合批，只绘制一次；测试核对合批前后三角形数相等。
- 可见装饰使用相机层 1；输入 raycaster 仅测试层 0 的原机关/目标，并排除隐藏命中。动态角色、旋转梯、门、遮挡平面和会随镜头隐藏的左墙不进入静态合批。
- 几何与材质在本场景 workshop 中复用，目标门的发光材质独占。`dispose()` 幂等，只释放本场景资源；不会释放旧资产库共享材质或另一个场景实例。
- 美术同步构建完才绑定操作。构建失败会回退到原灰盒并提示；无网络 GLB/贴图，因此没有虚构异步加载、进度或竞态系统。
- 重置复用当前场景，不重建模型或监听器。非 BFCache 页面退出时停止动画、撤销事件监听并释放资源；BFCache 保留时不提前销毁其上下文。
- 历史 `models/*.glb`、`asset-manifest.json` 与 CPU 预览继续是 G2 参考。旧导出脚本明确使用 `classic`，避免无意覆盖为新美术。

## 材质、光影与性能方法

七个建议色来自交接包，不声称是原画科学复原。非金属，木头 roughness 0.82，织物 0.94，其他大面约 0.9；明确 sRGB 输出、ACES 色调映射与曝光 1.02。窗侧暖主光 + 半球环境补光，无纹理照片、黑色 AO 描边、泛光或景深。

Quiet Arles 的软阴影贴图为 1024，正交范围 ±8；原灰盒保持 2048 / ±12。新增测试逐顶点验证四个旋转姿态中可见阴影投射物全部位于新阴影范围内，不以裁掉对象换性能。

`evidence/quiet-arles/after/quality.json` 给出同一云主机、Chrome、DPR=1、1600×900 和相同路线的前后测量。`before/measurement.json` 记录最初真实灰盒与 GPU 信息。`experiments/` 保留未优化/中间版本测量，不拿中间结果冒充最终结果。

**按需渲染的空闲 rAF 调度频率不是实际游戏 FPS。** 空闲报告同时记录实际渲染帧数；动画报告另列相同完整路线的 mean/P95 帧间隔和观测 FPS。draw calls / triangles 来自 renderer.info，不能当作包含所有独立阴影 pass 的 GPU 总调用数。软件渲染不是目标设备性能签核。

## 复现与启动

```sh
python3 -m http.server 8882 --bind 127.0.0.1
node --test --test-reporter=tap tests/*.test.mjs
node scripts/bundle.mjs
```

`?art=classic` 可查看兼容灰盒风格；严格前后对比使用原提交快照而非假称同一 UI：

```sh
node scripts/art-baseline.mjs /tmp/room-before-new
python3 -m http.server 8881 --bind 127.0.0.1 --directory /tmp/room-before-new
```

在另一个终端，用已安装的 Playwright/Chromium 执行；输出目录应选本次新目录，避免覆盖历史：

```sh
ROOM_ART_EVIDENCE=/tmp/room-art-quality node tests/e2e/quiet-arles.cjs
ROOM_TEST_BASE_URL=http://127.0.0.1:8882/ ROOM_EVIDENCE_DIR=/tmp/room-art-regression PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright node tests/e2e/browser-acceptance.cjs
```

浏览器/视频工具沿用原 runbook，不安装应用依赖。不要把本地截图标为线上截图，不将输入参考图打进构建或仓库。

## 当前验收边界

逐项实际结果、截图、性能数字与提交见 `evidence/quiet-arles/` 和本轮交付记录。原 G2.5 报告属于历史基线，不自动覆盖这次美术改动。美术样板可运行不代表新关卡或 G3 获批；作者审美签核、物理设备性能和真人可理解性仍需独立完成。
