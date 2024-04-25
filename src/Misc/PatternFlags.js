import { moduleName } from "../../tui-vtt.js";

export const cPatternIdF = "PatternIdFlag"; //Flag name for the maximum amount of Riders on this Token


export class PatternFlags {
    static PatternId(pToken) {} //returns the patternid od the Token 
    static PatternFlags(pToken) {} 

    static #PatternFlags (pToken) {	
        //returns all Module Flags of pToken (if any) (can contain Riding and Riders Flags)
            if (pToken) {
                if (pToken.flags.hasOwnProperty(moduleName)) {
                    return pToken.flags[moduleName];
                }
            }
            
            return; //if anything fails
        } 

    static #PatternIdFlag(pToken) {
        let vFlag = this.#PatternFlags(pToken);
        
        if (vFlag) {
            if (vFlag.hasOwnProperty(cPatternIdF) && (typeof vFlag.PatternIdFlag == "number")) {
                return vFlag.PatternIdFlag;
            }
        }
        
        return game.settings.get(moduleName, "PatternId"); //default if anything fails
    }

    static PatternId(pToken) {
        if (PatternFlags.#PatternIdFlag(pToken) >= 0) {
            return PatternFlags.#PatternIdFlag(pToken);
        }
        else {
            return Infinity;
        }
    }
}

