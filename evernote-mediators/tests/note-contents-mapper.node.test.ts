import { NoteContentsMapper } from "../note-contents-mapper";
import * as QUnit from "qunitjs";
import { Schedule } from "../../study-model/schedule-model";
import { tap } from "../../utils/obj";
import {ClozeIdentifier} from "../../study-model/note-model";
import {ScheduleUpdate} from "../../api/api-models";

QUnit.module(__filename);

function wrapInsideEnNote(body:string) {
  return `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/
pub/enml2.dtd"><en-note>${body}</en-note>`;
}

QUnit.test("terms must begin after an empty line", (assert) => {
  var mapper = new NoteContentsMapper(wrapInsideEnNote(`
    <div>
      This would be some<br/>
      content[1], in which the following is not a term.<br/>
      [1] House<br/>
      <br/>
      But this would be[2].<br/>
      <br/>
      [2] be
    </div>
  `));

  mapper.map();

  assert.equal(mapper.note.text, `This would be some
content[1], in which the following is not a term.
[1] House

But this would be[2].`);
  assert.equal(mapper.note.terms.length, 1);
  assert.equal(mapper.note.terms[0].marker, "2");
  assert.equal(mapper.note.terms[0].original, "be");
});

QUnit.test("note contents are trimmed of trailing and extraneous inner newlines", (assert) => {
  var mapper = new NoteContentsMapper(wrapInsideEnNote(`
    <div>
    <br/>Hello
    <br/>
    <br/>
    <br/>
    <br/>
    <br/> World
    <br/>
    <br/>
    <br/>
    </div>
  `));

  mapper.map();

  assert.equal(mapper.note.text, "Hello\n\nWorld");
});

QUnit.test("clozes can begin with — instead of --", (assert) => {
  var mapper = new NoteContentsMapper(wrapInsideEnNote(`
    <div>
    <br/>
    <div>[1] a term</div>
    <div>— with new true due 04-11-2011 11:25 interval PT16M00S last 03-04-2011 18:11</div>
    </div>
  `));

  mapper.map();

  assert.equal(mapper.note.terms.length, 1);
  assert.equal(mapper.note.terms[0].clozes.length, 1);
  assert.equal(mapper.note.terms[0].clozes[0].segment, "with");
  assert.equal(mapper.note.terms[0].clozes[0].schedule.isNew, true);
  assert.equal(mapper.note.terms[0].clozes[0].schedule.dueAtMinutes, 21708685);
  assert.equal(mapper.note.terms[0].clozes[0].schedule.intervalMinutes, 16);
  assert.equal(mapper.note.terms[0].clozes[0].schedule.lastAnsweredMinutes, 21654371);
});

QUnit.test("clozes can be parsed with or without schedules", (assert) => {
  var now = Date.now();
  var mapper = new NoteContentsMapper(wrapInsideEnNote(`
    <div>
    <br/>
    <div>[1] a term</div>
    <div>-- without</div>
    <div>-- with new true due 04-11-2011 11:25 interval PT16M00S last 03-04-2011 18:11</div>
    </div>
  `), undefined, now);

  mapper.map();

  assert.equal(mapper.note.terms.length, 1);
  assert.equal(mapper.note.terms[0].clozes.length, 2);
  assert.equal(mapper.note.terms[0].clozes[0].segment, "without");
  assert.equal(mapper.note.terms[0].clozes[0].schedule.dueAtMinutes, now + 120);
  assert.equal(mapper.note.terms[0].clozes[0].schedule.intervalMinutes, 0);
  assert.equal(mapper.note.terms[0].clozes[0].schedule.lastAnsweredMinutes, 0);
  assert.equal(mapper.note.terms[0].clozes[1].segment, "with");
  assert.equal(mapper.note.terms[0].clozes[1].schedule.isNew, true);
  assert.equal(mapper.note.terms[0].clozes[1].schedule.dueAtMinutes, 21708685);
  assert.equal(mapper.note.terms[0].clozes[1].schedule.intervalMinutes, 16);
  assert.equal(mapper.note.terms[0].clozes[1].schedule.lastAnsweredMinutes, 21654371);
});

QUnit.test("replacing the schedule of a cloze", (assert) => {
  var mapper = new NoteContentsMapper(wrapInsideEnNote(`
    <div>
    <div>Some content</div>
    <br/>
    <div>[1] a term</div>
    <div>-- without</div>
    <div>-- with new false due 04-11-2011 11:25 interval PT16M40S last 03-04-2011 18:11</div>
    <br/>
    <div>[2] other</div>
    <div>-- ot</div>
    <div>-- her new true due <span>04-11-2011</span> 11:25 int<span>erval PT16M40S</span> last 03-04-2011 18:11</div>
    </div>
  `), [
    tap(new ScheduleUpdate())((u:ScheduleUpdate) => {
      u.schedule.intervalMinutes = 14201;
      u.schedule.lastAnsweredMinutes = 24191912;
      u.schedule.dueAtMinutes = 28173945;
      u.schedule.isNew = false;
      u.scheduledIdentifier.clozeIdentifier.termMarker = "2";
      u.scheduledIdentifier.clozeIdentifier.clozeIdx = 1;
    }),
    tap(new ScheduleUpdate())((u:ScheduleUpdate) => {
      u.schedule.intervalMinutes = 1120;
      u.schedule.lastAnsweredMinutes = 92102;
      u.schedule.dueAtMinutes = 458192;
      u.schedule.isNew = true;
      u.scheduledIdentifier.clozeIdentifier.termMarker = "1";
      u.scheduledIdentifier.clozeIdentifier.clozeIdx = 0;
    }),
    tap(new ScheduleUpdate())((u:ScheduleUpdate) => {
      u.schedule.intervalMinutes = 2501;
      u.schedule.lastAnsweredMinutes = 2340;
      u.schedule.dueAtMinutes = 321420;
      u.schedule.isNew = true;
      u.scheduledIdentifier.clozeIdentifier.termMarker = "1";
      u.scheduledIdentifier.clozeIdentifier.clozeIdx = 1;
    }),
  ], 0);

  mapper.map();
  assert.equal(mapper.document.root().toString(),
    `<en-note>
    <div>
    <div>Some content</div>
    <br/>
    <div>[1] a term</div>
    <div>-- without new true due 11-15-1970 04:32 interval PT18H40M last 03-05-1970 23:02</div>
    <div>-- with new false due 04-11-2011 11:25 interval PT16M40S last 03-04-2011 18:11</div>
    <br/>
    <div>[2] other</div>
    <div>-- ot</div>
    <div>-- her new false due 07-27-2023 05:45 interval PT236H41M last 12-30-2015 22:32<span>*</span>*<span>*</span>*</div>
    </div>
  </en-note>`);

  function verifyClozeSchedules() {
    assert.equal(mapper.note.terms.length, 2);
    assert.equal(mapper.note.terms[0].clozes.length, 2);
    assert.equal(mapper.note.terms[1].clozes.length, 2);

    assert.equal(mapper.note.terms[0].clozes[0].schedule.dueAtMinutes, 458192);
    assert.equal(mapper.note.terms[0].clozes[0].schedule.intervalMinutes, 1120);
    assert.equal(mapper.note.terms[0].clozes[0].schedule.lastAnsweredMinutes, 92102);
    assert.equal(mapper.note.terms[0].clozes[0].schedule.isNew, true);

    assert.equal(mapper.note.terms[0].clozes[1].schedule.dueAtMinutes, 21708685);
    assert.equal(mapper.note.terms[0].clozes[1].schedule.intervalMinutes, 16);
    assert.equal(mapper.note.terms[0].clozes[1].schedule.lastAnsweredMinutes, 21654371);
    assert.equal(mapper.note.terms[0].clozes[1].schedule.isNew, false);

    assert.equal(mapper.note.terms[1].clozes[0].schedule.dueAtMinutes, 120);
    assert.equal(mapper.note.terms[1].clozes[0].schedule.intervalMinutes, 0);
    assert.equal(mapper.note.terms[1].clozes[0].schedule.lastAnsweredMinutes, 0);
    assert.equal(mapper.note.terms[1].clozes[0].schedule.isNew, true);

    assert.equal(mapper.note.terms[1].clozes[1].schedule.dueAtMinutes, 28173945);
    assert.equal(mapper.note.terms[1].clozes[1].schedule.intervalMinutes, 14201);
    assert.equal(mapper.note.terms[1].clozes[1].schedule.lastAnsweredMinutes, 24191912);
    assert.equal(mapper.note.terms[1].clozes[1].schedule.isNew, false);
  }

  verifyClozeSchedules();
  mapper = new NoteContentsMapper(mapper.document.toString(), undefined, 0);
  mapper.map();
  verifyClozeSchedules();
});

QUnit.test("terms accumulate the details and ignores cloze entries", (assert) => {
  var mapper = new NoteContentsMapper(wrapInsideEnNote(`
    <div>
    <div>Top</div>
    <br/>
    <div>[1] a term</div>
    <div>-- without</div>
    <div>-- with new true due 04-11-2011 11:25 interval PT16M40S last 03-04-2011 08:11</div>
    <div> Some details </div>
    <div> Other details </div>
    <br/>
    <div>[2] other term</div>
    <div>-- without</div>
    <div>-- with new false due 04-11-2011 11:25 interval PT16M40S last 03-04-2011 08:11</div>
    <div> Some details </div>
    <div> Other details </div>
    <div><br/>This would be content</div>
    </div>
  `));

  mapper.map();

  assert.equal(mapper.note.terms.length, 2);
  assert.equal(mapper.note.terms[0].details, "Some details\nOther details");
  assert.equal(mapper.note.terms[1].details, "Some details\nOther details");
  assert.equal(mapper.note.text, "Top\n\nThis would be content");
});

QUnit.test("terms details text is trimmed, even when at the end of a document", (assert) => {
  var mapper = new NoteContentsMapper(wrapInsideEnNote(`
    <div>
    <br/>
    <div>[2] other term</div>
    <div> Some details </div>
    <div> Other details </div>
    </div>
  `));

  mapper.map();

  assert.equal(mapper.note.terms.length, 1);
  assert.equal(mapper.note.terms[0].details, "Some details\nOther details");
});

QUnit.test("Finds hint text correctly", (assert) => {
  var mapper = new NoteContentsMapper(wrapInsideEnNote(`
    <div>
    <div>Top</div>
    <br/>
    <div>[1] a term</div>
    <div>? a hint here</div>
    <div>-- without</div>
    <div>-- with new true due 04-11-2011 11:25 interval PT16M40S last 03-04-2011 08:11</div>
    <div> Some details </div>
    <br/>
    <div>[2] other term</div>
    <div>-- without</div>
    <div>? actually details</div>
    <div>-- with new false due 04-11-2011 11:25 interval PT16M40S last 03-04-2011 08:11</div>
    <div><br/>This would be content</div>
    </div>
  `));

  mapper.map();

  assert.equal(mapper.note.terms.length, 2);
  assert.equal(mapper.note.terms[0].details, "Some details");
  assert.equal(mapper.note.terms[1].details, "? actually details");
  assert.equal(mapper.note.terms[0].hint, "a hint here");
  assert.equal(mapper.note.terms[1].hint, "");
});

QUnit.test("Maps image resource that belong to terms", (assert) => {
  var mapper = new NoteContentsMapper(wrapInsideEnNote(`
    <div>
    <div>Top</div>
    <div><en-media hash="abcdef" type="image/png"></en-media></div>
    <br/>
    <div>[1] a term</div>
    <div>? a hint here</div>
    <div>-- without</div>
    <div>-- with new true due 04-11-2011 11:25 interval PT16M40S last 03-04-2011 08:11</div>
    <div> Some details
    <en-media hash="one" type="image/png"></en-media>
    </div>
    <br/>
    <div>[2] other term</div>
    <div>-- without</div>
    <div>? actually details</div>
    <div>-- with new false due 04-11-2011 11:25 interval PT16M40S last 03-04-2011 08:11</div>
    <en-media hash="two" type="image/png"></en-media>
    <en-media hash="notthree" type="not/image"></en-media>
    <en-media hash="three" type="image/gif"></en-media>
    </div>
  `));

  mapper.map();

  assert.equal(mapper.note.terms.length, 2);
  assert.deepEqual(mapper.note.terms[0].imageIds, ["one"]);
  assert.deepEqual(mapper.note.terms[1].imageIds, ["two", "three"]);
})