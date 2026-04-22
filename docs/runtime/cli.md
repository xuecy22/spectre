# CLI

> 源码：`src/runtime/cli.ts`

## 职责

Operator 监控和控制命令。

## 命令

```bash
spectre status          # 当前状态、最近一次唤醒时间、今日行动摘要
spectre metrics         # engagement 数据趋势
spectre history         # 最近 N 条发帖/互动记录
spectre logs            # 决策日志
spectre report          # 生成进化报告 HTML（→ report.md）
spectre pause           # 暂停运行
spectre resume          # 恢复运行
spectre stop            # 优雅停机（→ orchestrator.md Life 终止）
```

### spectre report

生成可分享的进化报告 HTML 文件，用于向外部人员展示 agent 的进化过程。

```bash
spectre report                          # 默认最近 30 天，输出到 report.html
spectre report --days 7                 # 最近 7 天
spectre report --days 90 --out demo.html  # 指定输出路径
```

详见 → [report](report.md)
