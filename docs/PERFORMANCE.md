# Swish Performance Constitution

## Target

PC 的默认目标是稳定 60 FPS。高刷新率设备允许浏览器和 Phaser Game Loop 按其刷新率正常运行。

## Timing

核心游戏判定不得基于 frame count。投篮释放、动作持续时间、combo 与节奏判定必须使用 `performance.now()` 的高精度单调时间。

## Movement

所有连续运动必须使用 Phaser Game Loop 的 `delta` time；不得每帧固定移动像素或假设固定 FPS。

## Input

输入 timing 使用 `keydown`、`keyup` 和高精度时间差。必须忽略 key repeat，并在 `blur` 或页面隐藏时安全 reset，避免失焦后留下 pressed 状态或幽灵输入。

## Rendering

优先使用 WebGL。不得使用 DOM 作为主要游戏动画系统；游戏动画由 Phaser 渲染循环驱动。

## GC

游戏循环中避免大量临时对象、数组和字符串。监控数据使用固定长度历史，开发 UI 采用节流刷新。

## Performance Gate

每个重要版本进入下一阶段前必须检查 FPS、Frame Time、Long Frame、Console Error、是否有明显 memory 异常，以及输入响应。出现明显性能回退时，先解决性能，再进入下一版本。
