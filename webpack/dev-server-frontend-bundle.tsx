import * as React from "react";
import * as Rx from "rx-lite";
import {BundlesDirectoryComponent} from "./bundles-directory-component";
import { main } from "../cycle-rx-utils/bundles";

main(() => <BundlesDirectoryComponent bundleNames={(window as any)['bundleNames']}/>);
