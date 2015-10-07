import { ServiceHandler } from "../web-server/service-handler";
import { SummaryStats } from "../api/endpoints";
import { SummaryStatsRequest, SummaryStatsResponse } from "../api/api-models";
import {User} from "../user-model/user-model";
import * as Rx from "rx";
import {MasterScheduleStorage} from "../remote-storage/master-schedule-storage";
import {EvernoteSyncService} from "../evernote-mediators/evernote-sync-service";
import * as moment from "moment";
import {EvernoteClientRx} from "../evernote-client-rx/evernote-client-rx";
import {Evernote} from "evernote";

export class SummaryStatsService implements ServiceHandler<SummaryStatsRequest, SummaryStatsResponse, User> {
  constructor(private scheduleStorage:MasterScheduleStorage,
              private evernoteClient:EvernoteClientRx,
              private syncService:EvernoteSyncService) {
  }

  endpoint = SummaryStats;

  handle(req:SummaryStatsRequest, res:SummaryStatsResponse, user$:Rx.Observable<User>) {
    return user$.flatMap((user) => {
      return this.syncService.sync(user).ignoreElements().toArray().map(() => user);
    }).flatMap((user) => {
      var now = moment();
      var userClient = this.evernoteClient.forUser(user);

      return userClient.listTagsByNotebook(user.studyBook.guid)
        .flatMap(tags => {
          var tagGuids = tags.filter(tag => req.studyFilters.indexOf(tag.name) != -1)
            .map(tag => tag.guid);
          return this.scheduleStorage.findNumDue(user,
            Math.floor(now.endOf("day").unix()), tagGuids);
        });
    }).doOnNext((numDue) => {
      res.dueToday = numDue;
    });
  }
}