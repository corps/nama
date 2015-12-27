import * as QUnit from "qunitjs";
import { Scheduler } from "../scheduler";
import { Schedule } from "../schedule-model";
import * as moment from "moment";

QUnit.module(__filename);

QUnit.test("lastAnsweredSecs is set to the provided answered time", (assert) => {
  var scheduler = new Scheduler(() => 0.5);
  var schedule = new Schedule();
  schedule.lastAnsweredMinutes = 34819;
  assert.equal(scheduler.nextByFactor(schedule, 200, 604910).lastAnsweredMinutes, 604910);
});

QUnit.test("dueAtSecs is set to the answered at plus the intervalSecs", (assert) => {
  var scheduler = new Scheduler(() => 0.5);
  var schedule = new Schedule();
  var next = scheduler.nextByFactor(schedule, 200, 604910);
  assert.equal(next.dueAtMinutes, next.lastAnsweredMinutes + next.intervalMinutes);
});

QUnit.test("scheduling a new, empty schedule with a >= 2.0 factor", (assert) => {
  var scheduler = new Scheduler(() => 0.5);
  var schedule = new Schedule();

  var next = scheduler.nextByFactor(schedule, 2, 100);

  assert.equal(next.isNew, false, "sets isNew to false");
  assert.equal(next.intervalMinutes, moment.duration(1, "day").asMinutes(),
    "uses a single day as its interval");
});

QUnit.test("scheduling a new, empty schedule with a >= 2.0 factor long after it was due",
  (assert) => {
    var scheduler = new Scheduler(() => 0.5);
    var schedule = new Schedule();

    schedule.dueAtMinutes = moment.duration(5, "days").asMinutes();

    var next = scheduler.nextByFactor(schedule, 20, moment.duration(10, "days").asMinutes());

    assert.equal(next.intervalMinutes, moment.duration(1, "day").asMinutes(),
      "still uses a single day as its minimal interval");
  });

QUnit.test("scheduling a new, empty schedule with a < 2.0 factor", (assert) => {
  var scheduler = new Scheduler(() => 0.5);
  var schedule = new Schedule();

  var next = scheduler.nextByFactor(schedule, 0.5, 1000);

  assert.equal(next.isNew, true, "keeps isNew to true");
  assert.equal(next.intervalMinutes, moment.duration(10, "minutes").asMinutes(),
    "uses 10 minutes as its interval");
});

QUnit.test("scheduling a non new, < 2.0 factor", (assert) => {
  var scheduler = new Scheduler(() => 0.5);
  var schedule = new Schedule();
  schedule.isNew = false;

  var next = scheduler.nextByFactor(schedule, 0.3, 1000);

  assert.equal(next.isNew, false, "keeps isNew to false");
});

QUnit.test("scheduling a non new, >= 2.0 factor", (assert) => {
  var scheduler = new Scheduler(() => 0.5);
  var schedule = new Schedule();
  schedule.isNew = false;

  var next = scheduler.nextByFactor(schedule, 3.3, 1000);

  assert.equal(next.isNew, false, "keeps isNew to false");
});

QUnit.test("scheduling with variance", (assert) => {
  var scheduler = new Scheduler(() => 0.5);
  var schedule = new Schedule();
  schedule.isNew = false;
  schedule.intervalMinutes = scheduler.minimalIntervalOf(schedule) * 2;
  schedule.dueAtMinutes = schedule.intervalMinutes;

  assert.equal(scheduler.nextByFactor(schedule, 4, schedule.intervalMinutes).intervalMinutes,
    schedule.intervalMinutes * 4);

  scheduler = new Scheduler(() => 0.0);
  assert.equal(scheduler.nextByFactor(schedule, 4, schedule.intervalMinutes).intervalMinutes,
    Math.floor(schedule.intervalMinutes * (1 + 3 * 0.6)));

  scheduler = new Scheduler(() => 1.0);
  assert.equal(scheduler.nextByFactor(schedule, 4, schedule.intervalMinutes).intervalMinutes,
    Math.floor(schedule.intervalMinutes * (1 + 3 * 1.4)));

  scheduler = new Scheduler(() => 0.5);
  assert.equal(scheduler.nextByFactor(schedule, 0.8, schedule.intervalMinutes).intervalMinutes,
    schedule.intervalMinutes * 0.8);

  scheduler = new Scheduler(() => 0.0);
  assert.equal(scheduler.nextByFactor(schedule, 0.8, schedule.intervalMinutes).intervalMinutes,
    schedule.intervalMinutes * 0.8);

  scheduler = new Scheduler(() => 1.0);
  assert.equal(scheduler.nextByFactor(schedule, 0.8, schedule.intervalMinutes).intervalMinutes,
    schedule.intervalMinutes * 0.8);
});

QUnit.test("scheduling non new cards with various intervals and factors", (assert) => {
  var scheduler = new Scheduler(() => 0.5);
  var schedule = new Schedule();
  schedule.isNew = false;

  var minimal = scheduler.minimalIntervalOf(schedule);
  var minimalRatioInterval:number;
  var factor:number;
  var intervalRatioWaited:number;

  function assertResultingInterval(expected:number) {
    schedule.intervalMinutes = minimal * minimalRatioInterval;
    schedule.dueAtMinutes = schedule.lastAnsweredMinutes + schedule.intervalMinutes;
    assert.equal(
      scheduler.nextByFactor(schedule, factor,
        schedule.lastAnsweredMinutes + schedule.intervalMinutes * intervalRatioWaited).intervalMinutes,
      expected, `when factor = ${factor},` + "\n" +
      `the interval is ${Math.floor(minimalRatioInterval * 100)}% of the minimal,` + "\n" +
      `and answered time is ${Math.floor(intervalRatioWaited * 100)}% of the interval`)
  }

  factor = 0.6;
  {
    minimalRatioInterval = 1;
    {
      intervalRatioWaited = 1;
      assertResultingInterval(minimal);

      intervalRatioWaited = 0.25;
      assertResultingInterval(minimal);

      intervalRatioWaited = 3;
      assertResultingInterval(minimal);
    }

    minimalRatioInterval = 2;
    {
      intervalRatioWaited = 1;
      assertResultingInterval(minimal * 1.2);

      intervalRatioWaited = 0.25;
      assertResultingInterval(minimal * 1.2);

      intervalRatioWaited = 3;
      assertResultingInterval(minimal * 1.2);
    }
  }

  factor = 2.0;
  {
    minimalRatioInterval = 1;
    {
      intervalRatioWaited = 1;
      assertResultingInterval(minimal * 2);

      intervalRatioWaited = 0.75;
      assertResultingInterval(minimal * 1.75);

      intervalRatioWaited = 3;
      assertResultingInterval(minimal * 2);
    }

    minimalRatioInterval = 2;
    {
      intervalRatioWaited = 1;
      assertResultingInterval(minimal * 4);

      intervalRatioWaited = 0.75;
      assertResultingInterval(minimal * 3.5);

      intervalRatioWaited = 3;
      assertResultingInterval(minimal * 4);
    }
  }

});
