import * as QUnit from "qunitjs";
import { XHTMLLineParser } from "../xthml-line-parser";
import * as xml from "libxmljs";

class LineAccumulator extends XHTMLLineParser {
  lines = [] as string[];
  lineElements = [] as xml.Element[][];

  markNewLine(line:string, elements:xml.Element[]) {
    this.lines.push(line);
    this.lineElements.push(elements);
  }

  protected beginNewMap() {
    this.lines = [];
    this.lineElements = [];
    return super.beginNewMap();
  }

  protected handleElement(node:xml.Element) {
    if (super.handleElement(node)) return true;

    let childNodes = node.childNodes();
    this.markBlockBoundary();
    childNodes.forEach(n => this.map(n));
    this.markBlockBoundary();
    return true;
  }
}

QUnit.module(__filename);

QUnit.test("Detects lines at block boundaries", (assert) => {
  var accumulator = new LineAccumulator(`<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">
  Moo
  <div>
    A<div>
      b<br/>
    </div>
    c
  </div>
  Hi
</en-note>
  `);
  accumulator.map();

  assert.deepEqual(accumulator.lines, ["Moo", "A", "b", "c", "Hi"]);
  assert.equal(accumulator.lineElements.length, 5);
});

QUnit.test("Line breaks force a new line even on an empty line", (assert) => {
  var accumulator = new LineAccumulator(`<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">
  Moo
  <div>
    A<div>
      <br/>
    </div>
    c
  </div>
  Hi
</en-note>
  `);
  accumulator.map();

  assert.deepEqual(accumulator.lines, ["Moo", "A", "", "c", "Hi"]);
  assert.equal(accumulator.lineElements.length, 5);
});

QUnit.test("Line breaks force a new line even on an empty line", (assert) => {
  var accumulator = new LineAccumulator(`<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">
  Moo
  <div>
    A<div>
      <br/>
    </div>
    c
  </div>
  Hi
</en-note>
  `);
  accumulator.map();

  assert.deepEqual(accumulator.lines, ["Moo", "A", "", "c", "Hi"]);
  assert.equal(accumulator.lineElements.length, 5);
});

QUnit.test("List items contribute text even if empty itself", (assert) => {
  var accumulator = new LineAccumulator(`<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">
  Moo
  <ul>
    <li></li>
  </ul>
  Hi
</en-note>
  `);
  accumulator.map();

  assert.deepEqual(accumulator.lines, ["Moo", "*", "Hi"]);
  assert.equal(accumulator.lineElements.length, 3);
});

QUnit.test("Blocks only contribute lines when they contain non whitespace", (assert) => {
  var accumulator = new LineAccumulator(`<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">
  <div>
  <div>   </div>    </div>
  <div>   <div>  <span>
  </span> </div> Some text <span>here</span></div>
</en-note>
  `);
  accumulator.map();

  assert.deepEqual(accumulator.lines, ["Some text here"]);
  assert.equal(accumulator.lineElements.length, 1);
});

QUnit.test("Trims and compacts whitespace of the combined text of blocks on a line", (assert) => {
  var accumulator = new LineAccumulator(`<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">
  <div>  This  <span>text

  </span> is actually one <span><span>line</span>.</span></div>
</en-note>
  `);
  accumulator.map();

  assert.deepEqual(accumulator.lines, ["This text is actually one line."]);
  assert.equal(accumulator.lineElements.length, 1);
});

QUnit.test("Break lines can contribute empty text new lines", (assert) => {
  var accumulator = new LineAccumulator(`<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">
  This is a line
  <br/>
  <br/>
</en-note>
  `);
  accumulator.map();

  assert.deepEqual(accumulator.lines, ["This is a line", ""]);
  assert.equal(accumulator.lineElements.length, 2);
});

QUnit.test("Errors in xml are reported on map", (assert) => {
  var accumulator = new LineAccumulator(`<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">
   None valid &nbsp</meee>
</en-note>
  `);

  assert.throws(() => accumulator.map());
});

QUnit.test("the line elements provided are text components", (assert) => {
  var accumulator = new LineAccumulator(`<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">
  <div>This is some &nbsp;<i>text <span>split</span> across</i></div> parts
  for <div> the thing</div>
</en-note>
  `);

  accumulator.map();
  assert.equal(accumulator.lineElements.length, 3);
  assert.deepEqual(accumulator.lines, ["This is some text split across", "parts for", "the thing"]);
  assert.equal(accumulator.lineElements[0].length, 5);
  assert.equal(accumulator.lineElements[1].length, 1);
  assert.equal(accumulator.lineElements[2].length, 1);

  accumulator.lineElements[0][0].text("replaced");
  accumulator.lineElements[0][2].text("replaced");
  accumulator.lineElements[0][4].text("replaced");

  accumulator.lineElements.forEach(lineElements => {
    lineElements.forEach(element => assert.equal(element.type(), "text"));
  });

  accumulator = new LineAccumulator(accumulator.document.toString())
  accumulator.map();
  assert.deepEqual(accumulator.lines,
    ["replaced", "This is some replacedsplitreplaced", "parts for", "the thing"]);
});
