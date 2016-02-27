import * as Rx from "rx";
import * as path from "path";
import * as fs from "fs";
import {tap} from "../utils/obj";
import {DatabaseRx} from "../database-rx/database-rx";

export interface Migration {
  name: string,
  contents: string
}

var findDirContents = Rx.Observable.fromNodeCallback<string[], string>(fs.readdir);
var getFileStat = Rx.Observable.fromNodeCallback<fs.Stats, string>(fs.stat);
var getFileContents = Rx.Observable.fromNodeCallback<string, string>(
  (fn:string, cb:(err:any, contents:string)=>void) => {
    fs.readFile(fn, "utf8", cb);
  });

export class Migrator {
  constructor(private db:DatabaseRx) {
  }

  runAll(migration$ = this.findMigrations()):Rx.Observable<Migration> {
    var controlledMigration$ = this.getLatestMigration()
      .combineLatest(migration$,
        (latest, migration) => [latest, migration] as [string, Migration])
      .filter(([latest, migration]) => latest < migration.name)
      .map(([latest, migration]) => migration)
      .controlled();

    return tap(controlledMigration$.flatMap(migration => {
      return this.run(migration).doOnCompleted(() => {
        controlledMigration$.request(1);
      });
    }))(() => controlledMigration$.request(1));
  }

  findMigrations(dir = path.join(__dirname, "migrations")):Rx.Observable<Migration> {
    var content$ = findDirContents(dir).selectMany(s => s)
      .map(name => [name, path.join(dir, name)]);
    return content$
      .concatMap(
        ([name, path]) => getFileStat(path).filter(s => !s.isDirectory()),
        ([name, path], _) => [name, path])
      .concatMap(([name, path]) => getFileContents(path), ([name, path], c) => {
        return {
          name: name,
          contents: c
        };
      });
  }

  run(migration:Migration):Rx.Observable<Migration> {
    return this.setupMigrations().flatMap(() =>
      this.db.serialize(() => [
          this.db.exec(this.clean(migration.contents))
            .map(() => null),
          this.db.run("INSERT INTO migrations (name) VALUES (?)", [migration.name])
            .map(() => migration)
        ])
        .catch((e) => {
          return Rx.Observable.throw(new Error(migration.name + " failed: " + e));
        }));
  }

  private getLatestMigration():Rx.Observable<string> {
    return this.setupMigrations()
      .flatMap((v) =>
        this.db.get("SELECT name FROM migrations ORDER BY name DESC LIMIT 1", [])
          .map(row => (row || "") && row.name as string));
  }

  private clean(contents:string) {
    return contents.split("\n").filter(l => l.trim().slice(0, 2) != "--").join("\n");
  }

  private setupMigrations() {
    return this.db.exec("CREATE TABLE IF NOT EXISTS migrations ( name VARCHAR NOT NULL )");
  }
}
