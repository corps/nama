import { EvernoteIcon } from "./evernote-icon";
import { BookClosedIcon } from "./book-icons";
import { main } from "../cycle-rx-utils/bundles";
import { Display, Pixels } from "../css-properties/css-properties";
import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import {MapIcon} from "./map-icon";
import {PictureIcon} from "./picture-icon";
import {LinkIcon} from "./link-icon";

export var IconsTester = component<any>("IconsTester",
  (interactions, prop$) => {
    return {
      view: prop$.map(() =>
        <div>
          <EvernoteIcon
            style={{ display: Display.BLOCK, width: Pixels.of(50), border: "1px solid black" }}/>
          <MapIcon
            style={{ display: Display.BLOCK, width: Pixels.of(50), border: "1px solid black" }}/>
          <BookClosedIcon
            style={{ display: Display.BLOCK, width: Pixels.of(50), border: "1px solid black" }}/>
          <PictureIcon
            style={{ display: Display.BLOCK, width: Pixels.of(50), border: "1px solid black" }}/>
          <LinkIcon
            style={{ display: Display.BLOCK, width: Pixels.of(50), border: "1px solid black" }}/>
        </div>
      )
    }
  });

main(() => {
  return <div>
    <IconsTester />
  </div>;
});
