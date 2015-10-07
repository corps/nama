import { RedboxErrors, runner } from "./redbox-errors-component";
import { main } from "../cycle-rx-utils/bundles";

main(() => runner((window as any)['errors']));
