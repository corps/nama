import * as Rx from "rx";
import * as sqlite3 from "sqlite3";
import { tap } from "../utils/obj";

export class DatabaseRx {
  constructor(public db:sqlite3.Database) {
  }

  static open(location:string):Rx.Observable<DatabaseRx> {
    return tap(new Rx.AsyncSubject<DatabaseRx>())(s => {
      var db = new sqlite3.Database(location, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) return s.onError(err);
        s.onNext(new DatabaseRx(db));
        s.onCompleted();
      })
    });
  }

  get(sql:string, args:any[]):Rx.Observable<any> {
    return tap(new Rx.AsyncSubject<any>())(s => {
      this.db.get(sql, args, function (err, v) {
        if (err) return s.onError(err);
        s.onNext(v);
        s.onCompleted();
      })
    });
  }

  all(sql:string, args:any[]):Rx.Observable<any[]> {
    return tap(new Rx.AsyncSubject<any[]>())(s => {
      this.db.all(sql, args, function (err, v) {
        if (err) return s.onError(err);
        s.onNext(v);
        s.onCompleted();
      })
    });
  }

  exec(sql:string):Rx.Observable<void> {
    return tap(new Rx.AsyncSubject<void>())(s => {
      this.db.exec(sql, function (err) {
        if (err) return s.onError(err);
        s.onNext(null);
        s.onCompleted();
      })
    });
  }

  close():Rx.Observable<void> {
    return tap(new Rx.AsyncSubject<void>())(s => {
      this.db.close(function (err) {
        if (err) return s.onError(err);
        s.onNext(null);
        s.onCompleted();
      })
    });
  }

  run(sql:string, args:any[]):Rx.Observable<RunResult> {
    return tap(new Rx.AsyncSubject<RunResult>())(s => {
      this.db.run(sql, args, function (err) {
        if (err) return s.onError(err);
        s.onNext({lastID: this.lastID, changes: this.changes});
        s.onCompleted();
      })
    });
  }

  each(sql:string, args:any[]):Rx.Observable<any> {
    return tap(new Rx.Subject<any>())(s => {
      this.db.each(sql, args, (err, row) => {
        if (!err) s.onNext(row);
      }, (err) => {
        if (err) return s.onError(err);
        s.onCompleted();
      })
    });
  }

  serialize<T>(cb:()=>Rx.Observable<T>[]):Rx.Observable<T> {
    return tap(new Rx.Subject<T>())(s => {
      this.db.serialize(() => {
        Rx.Observable.merge(cb()).takeLast(1).subscribe(s);
      })
    });
  }
}

export interface RunResult {
  lastID: number
  changes: number
}