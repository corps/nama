import { arrayWithSome } from "../model-helpers/model-helpers";

export class LocalSettings {
  studyFilters = arrayWithSome("");
  userId = -1;
  maxQueueSize = 100;

  isLoggedIn() {
    return this.userId >= 0;
  }
}