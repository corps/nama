import { tap } from "../utils/obj";

export class Schedule {
  dueAtMinutes = 0;
  lastAnsweredMinutes = 0;
  intervalMinutes = 0;
  isNew = true;

  clone() {
    return tap(new Schedule())(s => {
      s.dueAtMinutes = this.dueAtMinutes;
      s.lastAnsweredMinutes = this.lastAnsweredMinutes;
      s.intervalMinutes = this.intervalMinutes;
      s.isNew = this.isNew;
    });
  }
}
