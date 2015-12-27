import { Cloze } from "./note-model";
import { tap } from "../utils/obj";
import { Schedule } from "./schedule-model";

const MINUTE = 1;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

const VARIANCE = 0.8;

export type RandomnessProvider = () => number;

export class Scheduler {
  constructor(private random:RandomnessProvider = Math.random.bind(Math)) {
  }

  minimalIntervalOf(schedule:Schedule) {
    return schedule.isNew ? 10 * MINUTE : DAY;
  }

  nextByFactor(schedule:Schedule, factor:number, answeredTimeMinutes:number) {
    return tap(schedule.clone())(c => {
      answeredTimeMinutes = Math.floor(answeredTimeMinutes);

      if (factor >= 2) c.isNew = false;

      var baseFactor = Math.min(factor, 1.0);
      var bonusFactor = Math.max(0.0, factor - 1.0);
      var randomFactor = this.random() * VARIANCE + (1.0 - VARIANCE / 2);

      var answeredInterval = answeredTimeMinutes - schedule.lastAnsweredMinutes;
      var currentInterval = Math.max(schedule.intervalMinutes || 0, this.minimalIntervalOf(schedule));
      var earlyAnswerMultiplier = Math.min(1.0, answeredInterval / currentInterval);

      var effectiveFactor = baseFactor + (bonusFactor * earlyAnswerMultiplier * randomFactor);
      var nextInterval = Math.max(currentInterval * effectiveFactor, this.minimalIntervalOf(c));
      nextInterval = Math.floor(nextInterval);

      c.lastAnsweredMinutes = answeredTimeMinutes;
      c.dueAtMinutes = answeredTimeMinutes + nextInterval;
      c.intervalMinutes = nextInterval;
    });
  }
}

