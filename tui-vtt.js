import { tuiConfig, registerSettings } from "./src/Misc/settings.js";
import { initializeTouchTokens, analyzeTouch } from "./src/analyzeTouch.js";

//Global variables
export const moduleName = "tui-vtt";
export let configDialog;

let hideElements = false;
let enableModule = false;

Handlebars.registerHelper('ifCond', function(v1, v2, options) {
    if(v1 === v2) {
      return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('ifNCond', function(v1, v2, options) {
    if(v1 === v2) {
        return options.inverse(this);
    }
    return options.fn(this);
});


Hooks.on('ready',()=>{
    console.log("TUI_READY"); 

    enableModule = game.user.name == game.settings.get(moduleName,'TargetName');
    hideElements = game.settings.get(moduleName,'HideElements') && game.user.isGM == false;
    if ((enableModule || game.user.isGM)){
        
        document.addEventListener('touchstart',function(e) {analyzeTouch('start',e);});
        document.addEventListener('touchmove',function(e) {analyzeTouch('move',e);});
        document.addEventListener('touchend',function(e) {analyzeTouch('end',e);});
        document.addEventListener('touchcancel',function(e) {analyzeTouch('end',e);});
        
        if (hideElements){
            $('#logo').hide();
            $('#sidebar').hide();
            $('#navigation').hide();
            $('#controls').hide();
            $('#players').hide();
            $('#hotbar').hide();
        }
    }

    if (!enableModule && !game.user.isGM) return;

    game.socket.on(`module.${moduleName}`, (payload) =>{
        //console.log(payload);
        
        if (game.user.id == payload.receiverId) {
            if (payload.msgType == "moveToken"){
                let token = canvas.tokens.get(payload.tokenId);
                if (token != undefined) token.document.update({x: payload.newCoords.x, y: payload.newCoords.y});
            }
        }
        else if (payload.msgType == 'refresh') {
            window.location.reload(); 
        }
        if (game.user.isGM) {
            if (payload.msgType == "controlToken") {
                // lastToken = game.canvas.tokens.get(payload.tokenId);
                // lastTokenSceneName = payload.lastTokenSceneName;
                // if (document.getElementById("MaterialPlane_Config") != null) {
                //     document.getElementById("mpLastTokenName").value=lastToken.name;
                //     document.getElementById("mpLastTokenActorName").value=lastToken.actor.name;
                //     document.getElementById("mpLastTokenSceneName").value=lastTokenSceneName;
                // }
            }
            else if (payload.msgType == 'setSettings') {
                game.settings.set(moduleName, payload.settingId, payload.value)
            }
        }    
    });
    
    if (game.user.isGM) game.settings.set(moduleName,'menuOpen',false);

    initializeTouchTokens();
});

Hooks.on('renderSidebarTab',(app,html)=>{
    //enableModule = game.user.name == game.settings.get(moduleName,'TargetName');
    if (!game.user.isGM) return;


    if(app.options.id == 'settings'){

        const label = $(
            `<div id="tui-section">
            <h2>TUI VTT</h2>

            <button id="TUI-VTT_ConfigBtn" title="TUI-VTT Configuration">
                <i></i> ${game.i18n.localize("TUI-VTT.Config.Title")}
            </button>
            </div>
            `
        );

        const setupButton = html.find("div[id='settings-game']");
        setupButton.after(label);

        document.getElementById("TUI-VTT_ConfigBtn").addEventListener("click",event=>{
            console.log("TUI_Click"); 
            //configDialog.setConfigOpen(true);
            configDialog.render(true);   

        });
    }
});


/**
 * Init hook
 * Initialize settings
 */
Hooks.once('init', function(){
    console.log("TUI_INIT");

    registerSettings();
    configDialog = new tuiConfig();
    
})

/**
 * Hide elements on various hooks
 */
Hooks.on('renderSceneNavigation', (app,html) => {
    if (hideElements) {
        html.hide();
    }
});

Hooks.on('renderSceneControls', (app, html) => {
    if (hideElements) {
        html.hide();
    }
});

Hooks.on('renderSidebarTab', (app, html) => {
    if (hideElements) {
        html.hide();
    }
});

Hooks.on('renderCombatTracker', (app, html) => {
    if (hideElements) {
        html.hide();
    }
});

Hooks.on('renderPlayerList', (app, html) => {
    if (hideElements) {
        html.hide();
    }
});
