import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import { Interaction } from "../cycle-rx-utils/interactions";
import { ScrollworkDivider } from "./scrollwork-divider-component";
import { ScrollworkMustache } from "./scrollwork-mustache-component";
import { ScrollworkRosehandle } from "./scrollwork-rosehandle-component";
import { main } from "../cycle-rx-utils/bundles";
import { Pixels, Display } from "../css-properties/css-properties";
import {ScrollworkFlourish} from "./scrollwork-flourish-component";

export var ScrollworkDividerTester = component<{}>("ScrollworkDividerTester",
  (interactions, prop$) => {
    return {
      view: prop$.map(() =>
        <div>
          <ScrollworkFlourish
            style={{ width: Pixels.of(800), height: Pixels.of(200), display: Display.BLOCK, border: "1px solid black" }}/>
          <ScrollworkMustache
            style={{ width: Pixels.of(100), display: Display.BLOCK, border: "1px solid black" }}/>
          <ScrollworkRosehandle
            style={{ width: Pixels.of(40), display: Display.BLOCK, border: "1px solid black" }}/>
          <ScrollworkDivider
            style={{ width: Pixels.of(500), display: Display.BLOCK, border: "1px solid black"}}/>
          <ScrollworkDivider
            verticalOrientation={true}
            style={{ height: Pixels.of(500), display: Display.BLOCK, border: "1px solid black"}}/>
        </div>
      )
    }
  });

main(() => {
  return <div>
    <ScrollworkDividerTester></ScrollworkDividerTester>
  </div>;
});
