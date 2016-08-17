import {tap} from "../utils/obj";
import {Schedule} from "./schedule-model";
import {arrayOf, arrayWithSome} from "../model-helpers/model-helpers";
import {escapeRegex} from "../utils/string";
import {XmlEntities} from "html-entities";
import moment = require('moment');

var entities = new XmlEntities();

function encloseInEnml(body:string) {
  return `<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">${body}</en-note>`
}

const fullStops = [
  "᠃", "᠉", "⳹", "⳾", "⸼", "。", "꓿", "꘎", "꛳", "︒", "﹒", "．", "｡", "𖫵",
  "𛲟", ".", "։", "۔", "܁", "܂", "።", "᙮", "\n", "?", "!", "¿", ";", "՞", "؟", "፧", "፨",
  "᥅", "⁇", "⁈", "⁉", "⳺", "⳻", "⸮", "꘏", "꛷", "︖", "﹖", "？", "𑅃", "¡", "՜", "߹", "᥄",
  "‼", "︕", "﹗", "！", "、"
];
const fullStopRegex = new RegExp(fullStops.map(escapeRegex).join("|") + "|\s\s\s+");
const allNotFullStopRegex = new RegExp("[^" + fullStopRegex.source + "]*");
const allNotFullStopTailRegex = new RegExp(allNotFullStopRegex.source + "$");
const allNotFullStopHeadRegex = new RegExp("^" + allNotFullStopRegex.source);
function atleastXUntilSentenceRegexTail(n:number) {
  return new RegExp("[^" + fullStopRegex.source + "]*.{0," + n + "}$", "g");
}

function atleastXUntilSentenceRegexHead(n:number) {
  return new RegExp("^.{0," + n + "}[^" + fullStopRegex.source + "]*");
}

export class Note {
  id = "";
  text = "";
  sourceURL = "";
  location = "";
  terms = arrayOf(Term);
  version = 0;

  findTermRegion(term:Term, text:string) {
    var fullMarker = term.original + "[" + term.marker + "]";
    var start = text.indexOf(fullMarker);
    if (start === -1) {
      if (term.marker.indexOf(term.original) === 0) {
        start = text.indexOf(term.marker);

        if (start == -1) return [-1, -1];
        return [start, start + term.marker.length]
      }
      return [-1, -1];
    }
    return [start, start + fullMarker.length];
  }

  findNextUniqueMarker(original:string) {
    var markers = {} as {[k:string]:boolean};
    this.terms.forEach(t => markers[t.marker] = true);

    for (var i = 1; ; ++i) {
      if (markers[i + ""]) continue;
      if (this.text.indexOf(original + "[" + i + "]") !== -1) continue;

      break;
    }

    return i + "";
  }

  toString() {
    var contentText = this.text
      .replace(/\r\n/g, "\n")
      .split("\n").map(l => l.trim()).join("\n")
      .replace(/\n\n/g, "\n");

    if (this.terms.length > 0) contentText += "\n\n";

    contentText += this.terms.map((t:Term) => {
      var lines = [] as string[];

      lines.push("[" + t.marker + "] " + t.original);
      if (t.hint) lines.push("? " + t.hint.replace(/\n/, " ").trim());

      t.clozes.forEach(cloze => {
        if (cloze.schedule) {
          lines.push(formatCloze(cloze));
        } else {
          lines.push("-- " + cloze.segment);
        }
      });

      lines.push();

      return lines.filter(s => !!s).join("\n")
    }).join("\n\n");

    return contentText;
  }

  toEvernoteContent() {
    return encloseInEnml(entities.encode(this.toString())
        .replace(/\b/g, "")
        .replace(/\n/g, "<br/>") + "<br/>");
  }

  findTermRegionInReplaced(term:Term):[number, number, string] {
    var text = this.text;
    for (var i = 0; i < this.terms.length; ++i) {
      if (this.terms[i].marker === term.marker) continue;
      var [s, e] = this.findTermRegion(this.terms[i], text);
      text = text.slice(0, s) + this.terms[i].original + text.slice(e);
    }

    var [s, e] = this.findTermRegion(term, text);

    return [s, e, text];
  }

  termContext(term:Term, grabCharsMax = 60):[string, string, string] {
    var [termStart, termEnd, text] = this.findTermRegionInReplaced(term);
    var leftSide = text.slice(0, termStart);
    var partialLeftSide = leftSide.slice(-grabCharsMax);
    var unusedLeft = leftSide.slice(0, leftSide.length - partialLeftSide.length);
    leftSide = unusedLeft.match(allNotFullStopTailRegex)[0] + partialLeftSide;

    var rightSide = text.slice(termEnd);
    var unusedRight = rightSide.slice(grabCharsMax);
    rightSide = rightSide.slice(0, grabCharsMax) + unusedRight.match(allNotFullStopHeadRegex)[0];

    return [leftSide.replace(/^\s*/, ""), text.slice(termStart, termEnd),
      rightSide.replace(/\s*$/, "")];
  }

  clozeParts(term:Term, cloze:Cloze):[string, string, string] {
    var left = "";
    var idx = 0;
    for (var i = 0; i < term.clozes.length; ++i) {
      var segment = term.clozes[i].segment;
      var nextIdx = term.original.indexOf(segment, idx);
      if (nextIdx !== -1) {
        left += term.original.slice(idx, nextIdx);
        nextIdx += segment.length;
        if (cloze === term.clozes[i]) {
          return [left, segment, term.original.slice(nextIdx)]
        }
        left += segment;
        idx = nextIdx;
      }
    }

    return [left, "", ""];
  }

  findTerm(clozeIdentifier:ClozeIdentifier) {
    if (clozeIdentifier.noteId != this.id) return null;
    for (var term of this.terms) {
      if (term.marker == clozeIdentifier.termMarker) {
        return term;
      }
    }
  }

  findCloze(clozeIdentifier:ClozeIdentifier) {
    var term = this.findTerm(clozeIdentifier);
    if (term == null) return null;
    return term.clozes[clozeIdentifier.clozeIdx];
  }
}

export class Term {
  original = "";
  marker = "";
  details = "";
  hint = "";
  imageIds = arrayWithSome("");
  clozes = arrayOf(Cloze);
}

export class Cloze {
  segment = "";
  schedule = new Schedule();
}

export class ClozeIdentifier {
  noteId = "";
  termMarker = "";
  clozeIdx = 0;

  static of(note:Note, term:Term, cloze:Cloze) {
    var result = new ClozeIdentifier();
    result.noteId = note.id;
    result.termMarker = term.marker;
    result.clozeIdx = term.clozes.indexOf(cloze);
    return result;
  }

  static fromString(ident:string) {
    var result = new ClozeIdentifier();
    var parts = ident.split(";");
    result.noteId = parts[0];
    result.termMarker = parts[1];
    result.clozeIdx = parseInt(parts[2], 10);
    return result;
  }

  toString() {
    return `${this.noteId.toString()};${this.termMarker.toString()};${this.clozeIdx.toString()}`;
  }

  static noteIdentifierOf(ident:string) {
    return ident.slice(0, ident.indexOf(';'));
  }
}

export class Resource {
  id = "";
  b64Data = "";
  contentType = "";
  width = 0;
  height = 0;
  noteId = "";
}

export function formatCloze(cloze:Cloze) {
  return `-- ${cloze.segment} ` +
    `new ${cloze.schedule.isNew} ` +
    `due ${moment(cloze.schedule.dueAtMinutes * 60 * 1000).utc().format(TIME_FORMAT)} ` +
    `interval ${moment.duration(cloze.schedule.intervalMinutes * 60 * 1000).toISOString()} ` +
    `last ${moment(cloze.schedule.lastAnsweredMinutes * 60 * 1000).utc().format(TIME_FORMAT)}`;
}

export const TIME_FORMAT = "MM-DD-YYYY HH:mm";
