# Schedule Configuration

> Agent 自由读写，配置唤醒调度策略

## Time Zone

```yaml
timezone: Asia/Tokyo
```

## Wake Schedule

```yaml
# 时间段（人设时区）    唤醒频率        行为模式
morning:   # 07:00-09:00
  interval: 30-60min
  behavior: 起床，浏览 timeline，偶尔互动

work_am:   # 09:00-12:00
  interval: 60-90min
  behavior: 工作状态，可能发创作过程

lunch:     # 12:00-14:00
  interval: 45-60min
  behavior: 午休，较活跃的互动期

work_pm:   # 14:00-18:00
  interval: 60-120min
  behavior: 工作状态，低频互动

evening:   # 18:00-22:00
  interval: 30-60min
  behavior: 最活跃时段，发成品、深度互动

night:     # 22:00-01:00
  interval: 60-120min
  behavior: 随意浏览，偶尔发感想

sleep:     # 01:00-07:00
  interval: null
  behavior: 模拟睡眠，不唤醒
```

## Random Jitter

```yaml
jitter: ±15min  # 避免机械感
```

## Adjustments

<!-- Agent 在此记录调度调整和原因 -->

---

**Last Updated**: <!-- Agent 自动更新 -->
