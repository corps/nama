import {ClozeIdentifier, Note, Resource} from "../study-model/note-model";
import {Schedule} from "../study-model/schedule-model";
import {arrayOf, arrayWithSome} from "../model-helpers/model-helpers";

export class ScheduledClozeIdentifier {
  clozeIdentifier = new ClozeIdentifier();
  noteVersion = 0;
}

export class ScheduleUpdate {
  scheduledIdentifier = new ScheduledClozeIdentifier();
  schedule = new Schedule();
  correction = false;
}

export class UpdateScheduleRequest {
  schedules = arrayOf(ScheduleUpdate);
}

export class UpdateScheduleResponse {
  completed = arrayOf(ScheduledClozeIdentifier);
}

export class GetLatestNoteRequest {
  noteId = "";
  noteVersion = 0;
}

export class GetLatestNoteResponse {
  note = new Note();
  wasUpToDate = true;
}

export class GetResourceRequest {
  resourceId = "";
}

export class GetResourceResponse {
  compressedResource = new Resource();
}

export class FetchScheduleRequest {
  requestedNum = 0;
  studyFilters = arrayWithSome("");
}

export class FetchScheduleResponse {
  notes = arrayOf(Note);
  scheduled = arrayOf(ScheduledClozeIdentifier);
  expires = 0;
}

export class GetMcdsRequest {
  ignoreIds = arrayWithSome("");
}

export class GetMcdsResponse {
  notes = arrayOf(Note);
}

export class PutMcdsRequest {
  notes = arrayOf(Note);
}

export class PutMcdsResponse {
  completedIds = arrayWithSome("");
}

export class SummaryStatsRequest {
  studyFilters = arrayWithSome("");
}

export class SummaryStatsResponse {
  dueToday = 0;
}
