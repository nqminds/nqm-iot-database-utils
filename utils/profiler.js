module.exports = (function() {
  "use strict";

  const start = function() {
    this.duration = 0;
    this.startTime = Date.now();
  };

  const stop = function() {
    this.duration = Date.now() - this.startTime;
    this.minTime = Math.min(this.minTime, this.duration);
    this.maxTime = Math.max(this.maxTime, this.duration);
  };

  const getDuration = function() {
    return this.duration;
  };

  const getMinMax = function() {
    return [this.minTime, this.maxTime];
  };

  function Profiler() {
    this.minTime = Number.MAX_VALUE;
    this.maxTime = 0;
    this.startTime = 0;
    this.duration = 0;

    this.start = start;
    this.stop = stop;
    this.getDuration = getDuration;
    this.getMinMax = getMinMax;
  }

  return Profiler;
}());
