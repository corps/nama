import {tap} from "../utils/obj";
import {Schedule} from "./schedule-model";
import {arrayOf, arrayWithSome} from "../model-helpers/model-helpers";
import {escapeRegex} from "../utils/string";

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
      start = text.indexOf(term.marker);
      return [start, start + term.marker.length]
    }
    return [start, start + fullMarker.length];
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

// trigger resync each 30 minutes, and load
// trigger resync after empty

// stores notes on client side
// stores series of schedules by version
// stores written schedules by same version

// first, write up all written schedules.
// remove corresponding original schedules
// remove any expired schedules
// remove any notes no longer used

// request size difference in new cards
// save

// keep copies in history memory
// 'inactive' view to help reload state
