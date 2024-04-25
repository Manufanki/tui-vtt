
import { moduleName } from "../../tui-vtt.js";
import { PatternFlags, cPatternIdF } from "../Misc/PatternFlags.js";

const cPatternIcon = "fas fa-fingerprint";

export class PatternSheetSettings 
{
    static SheetSetting(vApp, vHTML, vData, pisTile = false) {} //settings for sheets
	
	static AddHTMLOption(pHTML, pInfos) {} //adds a new HTML option to pHTML
	
	static FixSheetWindow(pHTML, pApp, pIndentifier) {} //fixes the formating of pHTML sheet window

    static SheetSetting(pApp, pHTML, pData, pisTile = false) {
			
        //create new tab
        let vTabsheet;
        let vprevTab;
        let vTabContentHTML;

        vTabsheet = pHTML.find(`[data-group="main"].sheet-tabs`);
        vprevTab = pHTML.find(`div[data-tab="resources"]`); //places pattern tab after last core tab "resources"
        vTabContentHTML = `<div class="tab" data-group="main" data-tab="${moduleName}"></div>`; //tab content sheet HTML	
    
        let vTabButtonHTML = `	
        <a class="item" data-tab="${moduleName}">
			<i class="${cPatternIcon}"></i>
             ${game.i18n.localize("TUI-VTT.Token.PatternTitle")}
        </a>
        `; //tab button HTML

        vTabsheet.append(vTabButtonHTML);
        vprevTab.after(vTabContentHTML);

        //Pattern Id
        PatternSheetSettings.AddHTMLOption(pHTML, {vlabel :"Token ID", 
            vhint : "The token ID must match the ID specified in the TUI VTT Configuration.", 
            vtype : "number", 
            vvalue : PatternFlags.PatternId(pApp.document),
            vflagname : cPatternIdF
            });
    }

	static AddHTMLOption(pHTML, pInfos) {
		let vlabel = "Name";	
		if (pInfos.hasOwnProperty("vlabel")) {
			vlabel = pInfos.vlabel;
		}
		
		let vtype = "text";	
		if (pInfos.hasOwnProperty("vtype")) {
			vtype = pInfos.vtype;
		}
		
		let vvalue = "";	
		if (pInfos.hasOwnProperty("vvalue")) {
			vvalue = pInfos.vvalue;
		}
		
		let vflagname = "";	
		if (pInfos.hasOwnProperty("vflagname")) {
			vflagname = pInfos.vflagname;
		}
		
		let vhint = "";	
		if (pInfos.hasOwnProperty("vhint")) {
			vhint = pInfos.vhint;
		}
		
		let vunits = "";	
		if (pInfos.hasOwnProperty("vunits")) {
			vunits = pInfos.vunits;
		} 
		
		let voptions = [];
		if (pInfos.hasOwnProperty("voptions")) {
			voptions = pInfos.voptions;
		} 
		
		let vnewHTML = ``;
		if (!(pInfos.hasOwnProperty("vwide") && pInfos.vwide)) {
			vnewHTML = `
				<div class="form-group slim">
					<label>${vlabel}</label>
				<div class="form-fields">
			`;
		}
		else {//for wide imputs
			vnewHTML = `
				<div class="form-group">
					<label>${vlabel}</label>
				<div class="form-fields">
			`;
		}
		
		switch (vtype){
			case "number":
			case "text":
				vnewHTML = vnewHTML + `<input type=${vtype} name="flags.${moduleName}.${vflagname}" value="${vvalue}">`;
				break;
				
			case "checkbox":
				if (vvalue) {
					vnewHTML = vnewHTML + `<input type=${vtype} name="flags.${moduleName}.${vflagname}" checked>`;
				}
				else {
					vnewHTML = vnewHTML + `<input type=${vtype} name="flags.${moduleName}.${vflagname}">`;
				}
				break;
				
			case "select":
				vnewHTML = vnewHTML + `<select name="flags.${moduleName}.${vflagname}">`;
				
				for (let i = 0; i < voptions.length; i++) {
					if (voptions[i] == vvalue) {
						vnewHTML = vnewHTML + `<option value="${voptions[i]}" selected>${Translate("TokenSettings." + vflagname+ ".options." + voptions[i])}</option>`;
					}
					else {
						vnewHTML = vnewHTML + `<option value="${voptions[i]}">${Translate("TokenSettings." + vflagname+ ".options." + voptions[i])}</option>`;
					}
				}
				
				vnewHTML = vnewHTML + `</select>`;
				break;
		}
			
		if (vhint != "") {
			vnewHTML = vnewHTML + `
				</div>
					<p class="hint">${vhint}</p>         
				</div>
			`;
		}
		
		pHTML.find(`div[data-tab="${moduleName}"]`).append(vnewHTML);
	}
	

}




