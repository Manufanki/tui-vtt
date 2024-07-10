import { moduleName } from "../../tui-vtt.js";
import { tokenMarker, findToken, debug, compatibleCore } from "../Misc/misc.js";
import { PatternTamplate } from "../Pattern/PatternTamplate.js";
import { BaseToken } from "./BaseToken.js";
export class PatternToken extends BaseToken{
    constructor(id, token, touchIds, patternTemplate) {
        super(id, token);
        this.touchIds = touchIds;
        this.initPatternTemplate = patternTemplate;
    }

    async update(data, scaledCoords, e){
        
        super.update(data, scaledCoords, e);
        this.timeoutId = setTimeout(()=>{this.moveTimeout = true;}, 5000);
        this.moveTimeout = false;
    }
}