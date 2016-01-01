import * as xml from "libxmljs";
import { Note, Term, Cloze, ClozeIdentifier } from  "../study-model/note-model";
import { Schedule } from "../study-model/schedule-model";
import { XHTMLLineParser } from "../xhtml-line-parser/xthml-line-parser";
import moment = require('moment');
import {ScheduleUpdate} from "../api/api-models";

const TERM_HEADER = /^\s*\[(.+)\]\s+(.+)/;
const HINT_LINE = /^\?\s+(.+)/;
const CLOZE_SCHEDULE_LINE = /^\s*(--|—)\s+(\S+)(\s+new\s+(.+)\s+due\s+(.+)\s+interval\s+(.+)\s+last\s+(.+))?/;

export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];

export class NoteContentsMapper extends XHTMLLineParser {
  public note:Note;

  private currentTerm:Term;
  private lineResourceHashes:string[];
  private lastLineEmpty:boolean;

  protected beginNewMap() {
    this.lastLineEmpty = false;
    this.note = new Note();
    this.lineResourceHashes = [];
    return super.beginNewMap();
  }

  constructor(xml:string, private scheduleUpdates?:ScheduleUpdate[]) {
    super(xml);
  }

  protected markNewLine(line:string, textElements:xml.Element[]) {
    var lastLineEmpty = this.lastLineEmpty;
    var currentLineResourceHashes = this.lineResourceHashes;
    var currentLineEmpty = !line && currentLineResourceHashes.length == 0;
    this.lastLineEmpty = currentLineEmpty;
    this.lineResourceHashes = [];

    var termHeaderMatch = line.match(TERM_HEADER);
    if (lastLineEmpty && termHeaderMatch) {
      if (this.currentTerm) {
        this.currentTerm.details = this.currentTerm.details.trim();
      }
      this.currentTerm = new Term();
      this.currentTerm.marker = termHeaderMatch[1];
      this.currentTerm.original = termHeaderMatch[2];
      this.note.terms.push(this.currentTerm);
      return;
    }

    if (lastLineEmpty && this.currentTerm) {
      this.currentTerm.details = this.currentTerm.details.trim();
      this.currentTerm = null;
    }

    if (!this.currentTerm) {
      this.note.text += line + "\n";
      return;
    }

    var clozeLineMatch = line.match(CLOZE_SCHEDULE_LINE);
    if (clozeLineMatch) {
      var cloze = new Cloze();
      this.currentTerm.clozes.push(cloze);

      cloze.segment = clozeLineMatch[2];

      if (clozeLineMatch[4]) {
        cloze.schedule.isNew = clozeLineMatch[4] === 'true';
        cloze.schedule.dueAtMinutes =
          Math.floor(moment.utc(clozeLineMatch[5], TIME_FORMAT).unix() / 60);
        cloze.schedule.intervalMinutes =
          Math.floor(moment.duration(clozeLineMatch[6]).asMinutes());
        cloze.schedule.lastAnsweredMinutes =
          Math.floor(moment.utc(clozeLineMatch[7], TIME_FORMAT).unix() / 60);
      }

      var scheduleUpdateMatch = this.scheduleUpdateMatch();
      if (scheduleUpdateMatch) {
        cloze.schedule = scheduleUpdateMatch.schedule;
        var formattedCloze = formatCloze(cloze);
        textElements = textElements.filter(te => te.text().trim().length > 0);
        textElements[0].text(formattedCloze);
        for (var i = 1; i < textElements.length; ++i) {
          textElements[i].text("*");
        }
      }
      return;
    }

    var hintLineMatch = line.match(HINT_LINE);
    if (hintLineMatch && !this.currentTerm.details && !this.currentTerm.clozes.length) {
      this.currentTerm.hint = hintLineMatch[1].trim();
      return;
    }

    if (!currentLineEmpty) {
      this.currentTerm.details += line + "\n";
      currentLineResourceHashes.forEach(hash => this.currentTerm.imageIds.push(hash));
    }
  }

  protected handleElement(node:xml.Element) {
    if (super.handleElement(node)) return true;
    let childNodes = node.childNodes();
    switch (node.name()) {
      case 'en-note':
        this.markBlockBoundary();
        childNodes.forEach(n => this.map(n));
        if (this.currentTerm) {
          this.currentTerm.details = this.currentTerm.details.trim();
        }
        this.markBlockBoundary();
        this.note.text = this.note.text.trim().replace(/\n\n+/g, "\n\n");
        return true;
      case 'en-media':
        this.currentLineNonEmpty = true;
        var hash = node.attr("hash").value();
        var type = node.attr("type").value();
        if (SUPPORTED_IMAGE_TYPES.indexOf(type) != -1) {
          this.lineResourceHashes.push(hash);
        }
        return true;
      case 'en-crypt':
        return true;
      case 'en-todo':
        this.markBlockBoundary();
        childNodes.forEach(n => this.map(n));
        this.markBlockBoundary();
        return true;
    }
    return false;
  }

  protected scheduleUpdateMatch() {
    if (this.scheduleUpdates == null) return null;
    var currentTerm = this.currentTerm;
    if (currentTerm == null) return null;
    for (var update of this.scheduleUpdates) {
      if (update.scheduledIdentifier.clozeIdentifier.termMarker !== currentTerm.marker) continue;
      if (update.scheduledIdentifier.clozeIdentifier.clozeIdx !== currentTerm.clozes.length - 1) continue;
      if (update.schedule.lastAnsweredMinutes < currentTerm.clozes[currentTerm.clozes.length - 1].schedule.lastAnsweredMinutes) {
        continue;
      }
      return update;
    }
  }
}

export function formatCloze(cloze:Cloze) {
  return `-- ${cloze.segment} ` +
    `new ${cloze.schedule.isNew} ` +
    `due ${moment(cloze.schedule.dueAtMinutes * 60 * 1000).utc().format(TIME_FORMAT)} ` +
    `interval ${moment.duration(cloze.schedule.intervalMinutes * 60 * 1000).toISOString()} ` +
    `last ${moment(cloze.schedule.lastAnsweredMinutes * 60 * 1000).utc().format(TIME_FORMAT)}`;
}

export const TIME_FORMAT = "MM-DD-YYYY HH:mm";

