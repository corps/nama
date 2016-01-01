var EThrift = require("evernote").Evernote.Thrift;
import {Evernote} from "evernote";

function toBuffer(ab:ArrayBuffer) {
  var buffer = new Buffer(ab.byteLength);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}

function toArrayBuffer(buffer:Buffer) {
  var ab = new ArrayBuffer(buffer.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return ab;
}


export function serializeEvernoteThrift(message:any) {
  var transport = new EThrift.BinaryHttpTransport("/");
  var protocol = new EThrift.BinaryProtocol(transport);
  protocol.writeMessageBegin();
  message.write(protocol);
  protocol.writeMessageEnd();
  return toBuffer(transport.flush(true).buffer).toString("base64");
}

export function deserializeEvernoteThrift(serialized:string, message:any) {
  var transport = new EThrift.BinaryHttpTransport("/");
  var protocol = new EThrift.BinaryProtocol(transport);
  transport.received = toArrayBuffer(new Buffer(serialized, "base64"));

  protocol.readMessageBegin();
  message.read(protocol);
  protocol.readMessageEnd();
}
