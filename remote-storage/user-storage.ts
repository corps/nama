import * as Rx from "rx";
import { User, OauthLogin, StudyBook } from "../user-model/user-model";
import { tap } from "../utils/obj";
import { DatabaseRx } from "../database-rx/database-rx";

export interface UserRow {
  id: number
}

export interface OauthLoginRow {
  userId: number
  provider: string
  token: string
  secret: string
  externalId: string
}

export interface StudyBookRow {
  id: number
  userId: number
  guid: string
  syncVersion: number
}

export class UserStorage {
  constructor(private db:DatabaseRx) {
  }

  lookupUserById(userId:number):Rx.Observable<User> {
    return Rx.Observable.zip(this.db.get("SELECT * FROM users WHERE id = ?", [userId]),
      this.db.all("SELECT * FROM oauthLogins WHERE userId = ?", [userId]),
      this.db.get("SELECT * FROM studyBooks WHERE userId = ? ORDER BY id DESC LIMIT 1", [userId]),
      (userRow:UserRow, oauthLoginRows:OauthLoginRow[], studyBookRow:StudyBookRow) => {
        if (userRow == null) throw new Error("No user found by id " + userId);
        return tap(new User())((u:User) => {
          u.id = userId;

          oauthLoginRows.forEach(login => {
            u.logins.push(tap(new OauthLogin())(l => {
              l.externalId = login.externalId;
              l.provider = login.provider;
              l.secret = login.secret;
              l.token = login.token;
            }));
          });

          if (studyBookRow != null) {
            u.studyBook.guid = studyBookRow.guid;
            u.studyBook.id = studyBookRow.id;
            u.studyBook.syncVersion = studyBookRow.syncVersion;
          }
        });
      }
    );
  }

  createOrUpdateUserForLogin(login:OauthLogin):Rx.Observable<number> {
    return this.db.run(
      "UPDATE oauthLogins SET token = ?, secret = ? " +
      "WHERE provider = ? AND externalId = ?",
      [login.token, login.secret, login.provider, login.externalId,]).flatMap((updateResult) => {
      if (updateResult.changes == 0) {
        return this.db.run("INSERT INTO users DEFAULT VALUES", []).flatMap((changes) => {
          var userId = changes.lastID;
          return this.db.run(
            "INSERT INTO oauthLogins (userId, provider, token, secret, externalId) " +
            "VALUES (?, ?, ?, ?, ?)", [
              userId, login.provider, login.token, login.secret, login.externalId
            ]).map(() => userId);
        })
      }

      return this.db.get(
        "SELECT userId FROM oauthLogins WHERE provider =? AND externalId = ?",
        [login.provider, login.externalId]).map((oauthRow:OauthLoginRow) => {
        return oauthRow.userId;
      })
    })
  }

  addNewStudyBook(userId:number, studyBookGuid:string, version:number):Rx.Observable<number> {
    return this.db.run("INSERT INTO studyBooks (userId, guid, syncVersion) VALUES (?, ?, ?)", [
      userId, studyBookGuid, version
    ]).map(c => c.lastID);
  }

  updateStudyBook(studyBookId:number, version:number):Rx.Observable<void> {
    return this.db.run(
      "UPDATE studyBooks SET syncVersion = ? WHERE id = ?", [version, studyBookId]
    ).map(() => null);
  }

  addOrUpdateAccountForUser(userId:number, login:OauthLogin):Rx.Observable<boolean> {
    return this.db.run(
        "UPDATE oauthLogins SET token = ?, secret = ? " +
        "WHERE provider = ? AND externalId = ? AND userId = ?",
      [login.token, login.secret, login.provider, login.externalId, userId])
      .flatMap((updateResult) => {
        if (updateResult.changes == 0) {
          return this.db.run(
            "INSERT INTO oauthLogins (userId, provider, token, secret, externalId) " +
            "VALUES (?, ?, ?, ?, ?)", [
              userId, login.provider, login.token, login.secret, login.externalId
            ]).map(() => true).catch((e) => {
            if (e.toString().indexOf("UNIQUE constraint failed") == -1) {
              throw e;
            }
            return Rx.Observable.just(false);
          })
        }

        return Rx.Observable.just(true);
      })
  }
}
