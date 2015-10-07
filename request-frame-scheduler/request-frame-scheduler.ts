import * as Rx from "rx-lite";

var fixup:any = (Rx.Disposable as any)._fixup;

class ClearDisposable implements Rx.IDisposable {
  isDisposed = false;

  constructor(private action:Function, private id:any) {
  }

  dispose() {
    if (!this.isDisposed) {
      this.isDisposed = true;
      this.action.apply(null, [this.id]);
    }
  }
}

class RequestFrameScheduler extends Rx.Scheduler {
  private scheduleAction(disposable:Rx.SingleAssignmentDisposable,
                         action:Function, scheduler:Rx.IScheduler, state:any) {
    return function schedule() {
      !disposable.isDisposed && disposable.setDisposable(fixup(action(scheduler, state)));
    }
  }

  schedule(state:any, action?:Function) {
    var disposable = new Rx.SingleAssignmentDisposable(),
      id = requestAnimationFrame(this.scheduleAction(disposable, action, this, state));
    var clearDisposable = new ClearDisposable(cancelAnimationFrame, id);

    return Rx.Disposable.create(() => {
      disposable.dispose();
      clearDisposable.dispose();
    })
  }

  _scheduleFuture(state:any, dueTime:number, action:Function) {
    if (dueTime === 0) {
      return this.schedule(state, action);
    }

    var disposable = new Rx.SingleAssignmentDisposable(),
      id = setTimeout(this.scheduleAction(disposable, action, this, state), dueTime);
    var clearDisposable = new ClearDisposable(clearTimeout, id);

    return Rx.Disposable.create(() => {
      disposable.dispose();
      clearDisposable.dispose();
    })
  }
}

export var requestFrameScheduler = new RequestFrameScheduler();