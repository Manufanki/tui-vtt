import { moduleName } from "../../tui-vtt.js";
import { tokenMarker, findToken, debug, compatibleCore } from "../Misc/misc.js";
import { PatternTamplate } from "../Pattern/PatternTamplate.js";
import { BaseToken } from "./BaseToken.js";
export class PatternToken extends BaseToken{
    constructor(id, token, touchIds, patternTemplate) {
        super(id, token);
        this.touchIds = touchIds;
        this.initPatternTemplate = patternTemplate;
        this.featureId = 0;
    }

    async update(data, scaledCoords, e){
        
        if (data.x == undefined || data.y == undefined) return false;
        let coords = {x:data.x,y:data.y}
        this.rawCoordinates = coords;
    
        if (this.token.can(game.user,"control"))
            this.token.control({releaseOthers:false});
        
        this.moveToken(scaledCoords);
        if (game.settings.get(moduleName,'movementMarker') && this.marker != undefined && this.token != undefined) this.marker.show();
            return true;
    }
}