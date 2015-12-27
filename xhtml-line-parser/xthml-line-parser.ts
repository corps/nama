import * as xml from "libxmljs";

export class XHTMLLineParser {
  protected currentLineText = "";
  protected currentLineNonEmpty = false;
  protected currentLineTextElements:xml.Element[] = [];

  public document:xml.XMLDocument;

  constructor(private xml:string) {
  }

  protected beginNewMap() {
    this.document = xml.parseXmlString(this.xml);
    this.currentLineText = "";
    this.currentLineNonEmpty = false;
    this.currentLineTextElements = [];
    return this.document.root();
  }

  protected handleText(text:string) {
    this.currentLineText += text;
    if (text.trim()) {
      this.currentLineNonEmpty = true;
    }
  }

  protected handleElement(node:xml.Element) {
    let childNodes = node.childNodes();
    switch (node.name()) {
      case 'br':
        this.currentLineNonEmpty = true;
        this.markBlockBoundary();
        return true;
      case 'tr':
      case 'li':
        this.markBlockBoundary();
        this.handleText("* ");
        childNodes.forEach(n => this.map(n));
        this.markBlockBoundary();
        return true;
      case 'pre':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
      case 'blockquote':
      case 'caption':
      case 'center':
      case 'dd':
      case 'dt':
      case 'div':
      case 'dl':
      case 'p':
      case 'hr':
      case 'tfoot':
      case 'th':
        this.markBlockBoundary();
        childNodes.forEach(n => this.map(n));
        this.markBlockBoundary();
        return true;
      case 'a':
      case 'abbr':
      case 'acronym':
      case 'address':
      case 'b':
      case 'bdo':
      case 'big':
      case 'cite':
      case 'code':
      case 'col':
      case 'del':
      case 'dfn':
      case 'em':
      case 'font':
      case 'i':
      case 'ins':
      case 'kbd':
      case 'q':
      case 's':
      case 'samp':
      case 'small':
      case 'span':
      case 'strike':
      case 'strong':
      case 'sub':
      case 'sup':
      case 'td':
      case 'title':
      case 'tt':
      case 'u':
      case 'var':
      case 'colgroup':
      case 'area':
      case 'map':
      case 'ol':
      case 'ul':
      case 'img':
      case 'table':
      case 'tbody':
      case 'thead':
        childNodes.forEach(n => this.map(n));
        return true;
    }

    return false;
  }

  map(node?:xml.Element) {
    if (node == null) {
      node = this.beginNewMap();
    }

    switch (node.type()) {
      case 'text':
        this.currentLineTextElements.push(node);
        this.handleText(node.text());
        break;
      case 'element':
        if (!this.handleElement(node)) {
          throw new Error("Did not know how to handle " + node.name());
        }
        break;
    }
  }

  protected markBlockBoundary() {
    if (this.currentLineNonEmpty) {
      var lineText = this.currentLineText.trim().replace(/\s+/g, ' ');
      let lineElements = this.currentLineTextElements;
      this.currentLineNonEmpty = false;
      this.currentLineText = "";
      this.currentLineTextElements = [];
      this.markNewLine(lineText, lineElements);
    }
  }

  protected markNewLine(line:string, lineElements:xml.Element[]) {
  }
}
