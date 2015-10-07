import { DatabaseRx } from "./database-rx";
import * as sqlite3 from "sqlite3";
import { tap } from "../utils/obj";
import * as Rx from "rx";


export class DebugDatabaseRx extends DatabaseRx {
  get(sql:string, args:any[]) {
    return this.checkQueryPlan<any>(sql, args).merge(super.get(sql, args));
  }

  all(sql:string, args:any[]) {
    return this.checkQueryPlan<any>(sql, args).merge(super.all(sql, args));
  }

  each(sql:string, args:any[]) {
    return this.checkQueryPlan<any>(sql, args).merge(super.each(sql, args));
  }

  run(sql:string, args:any[]) {
    return this.checkQueryPlan<any>(sql, args).merge(super.run(sql, args));
  }

  static open(location:string):Rx.Observable<DebugDatabaseRx> {
    return tap(new Rx.AsyncSubject<DebugDatabaseRx>())(s => {
      var db = new sqlite3.Database(location, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) return s.onError(err);
        s.onNext(new DebugDatabaseRx(db));
        s.onCompleted();
      })
    });
  }

  private checkQueryPlan<T>(sql:string, args:any[]) {
    if (!this.queryExplanationsEnabled) return Rx.Observable.empty<T>();
    return tap(new Rx.AsyncSubject<T>())(s => {
      this.db.all("EXPLAIN QUERY PLAN " + sql, args, (e, rows) => {
        if (e) return s.onError(e);
        if (this.seenExplanations[sql] == null) {
          this.seenExplanations[sql] = true;
          if (rows.length > 0) {
            this.queryExplanations.push(rows.map(r => r.detail));
          }
        }
        s.onCompleted();
      })
    });
  }

  private seenExplanations = {} as {[k:string]:any};
  queryExplanations = [] as any[];
  queryExplanationsEnabled = false;
}