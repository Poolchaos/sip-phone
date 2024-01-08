Timer

This is a very quick and dirty timer.

To use it effectively, if.bind it from where it is being used:

```html
<timer if.bind="startTime" start-time.bind="startTime" end-time.bind="endTime"></timer>
```

If it gets a start time, on attach, it starts a timer, doing a moment diff between `Date.now()` and `startTime` on each tick.
If end time is provided, timer will stop, and it only shows duration
