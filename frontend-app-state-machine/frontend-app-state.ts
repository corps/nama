import * as state from "./frontend-app-state";
import {ClientSession} from "../sessions/session-model";
import {LocalSettings} from "../local-storage/local-settings-model";
import {SummaryStatsResponse} from "../api/api-models";
import {ClozeIdentifier, Note} from "../study-model/note-model";
import {ScheduledStudy} from "../local-storage/local-study-storage";
import {Resource} from "../study-model/note-model";

export enum CurrentPage {
  LOGGED_OUT, SUMMARY, STUDYING
}

export class FrontendAppState {
  currentPage = CurrentPage.LOGGED_OUT;
  numStudiedCurSession = 0;
  scheduledStudy = new ScheduledStudy();
  summaryStats = new SummaryStatsResponse();
  summaryStatsLoaded = false;
  clientSession = new ClientSession();
  localSettings = new LocalSettings();
  images = [] as Resource[];
  curStudyIdx = 0;
  isAnswering = false;
}
