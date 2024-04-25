import { moduleName } from "../../tui-vtt.js";
import { PatternTamplate } from "../Triangle/PatternTamplate.js";
import { waitForPatternTouchs } from "../analyzeTouch.js";

export const registerSettings = function(){
     /**
     * Touch timeout
     */
     game.settings.register(moduleName, 'touchTimeout', {
        default: 1000,
        type: Number,
        scope: 'world',
        range: { min: 10, max: 5000, step: 10 },
        config: false,
    });

    /**
     * Tap timeout
     */
    game.settings.register(moduleName, 'tapTimeout', {
        default: 10,
        type: Number,
        scope: 'world',
        range: { min: 10, max: 5000, step: 10 },
        config: false, 
    });
    /**
     * Touch Scale X
     */
     game.settings.register(moduleName, 'touchScaleX', {
        default: 1,
        type: Number,
        scope: 'world',
        range: { min: 0, max: 2, step: 0.01 },
        config: false,
    });

    /**
     * Touch Scale Y
     */
     game.settings.register(moduleName, 'touchScaleY', {
        default: 1,
        type: Number,
        scope: 'world',
        range: { min: 0, max: 2, step: 0.01 },
        config: false,
    });
    /**
     * Zoom Factor
     */
    game.settings.register(moduleName, 'zoomFactor', {
        default: 0.35,
        type: Number,
        scope: 'world',
        range: { min: 0.1, max: 1, step: 0.05 },
        config: false, 
    });
        /**
     * Rotation Threshold
     */
        game.settings.register(moduleName, 'rotationThreshold', {
            default: 20,
            type: Number,
            scope: 'world',
            range: { min: 0, max: 100, step: 5 },
            config: false, 
        });

        /**
     * Release the token after dropping
     */
    game.settings.register(moduleName,'deselect', {
        scope: "world",
        config: false,
        default: true,
        type: Boolean
    });

    /**
     * Draw movement marker
     */
     game.settings.register(moduleName,'movementMarker', {
        scope: "world",
        config: false,
        default: true,
        type: Boolean
    });
    /**
 * Allow Navigation
 */
    game.settings.register(moduleName,'touchNavigation', {
        scope: "world",
        config: false,
        default: true,
        type: Boolean
    });
    /**
     * Sets if the target client is allowed to move non-owned tokens
     */
    game.settings.register(moduleName,'EnNonOwned', {
        scope: "world",
        config: false,
        default: true,
        type: Boolean
    });

    /**
     * Sets if the target client is allowed to move non-owned tokens
     */
     game.settings.register(moduleName,'collisionPrevention', {
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    });

    /**
     * Hides all elements on the target client, if that client is not a GM
     */
    game.settings.register(moduleName,'HideElements', {
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    });

    game.settings.register(moduleName,'patternSetup', {
        scope: "world",
        config: false,
        type: Array,
        default: []
    });
    
    /**
     * Sets the name of the target client (who has the TV connected)
     */
     game.settings.register(moduleName,'TargetName', {
        scope: "world",
        config: false,
        default: "Observer",
        type: String
    });

    //invisible settings
    game.settings.register(moduleName,'menuOpen', {
        scope: "client",
        config: false,
        default: false,
        type: Boolean
    });

    game.settings.register(moduleName, "PatternId", {
        scope: "world",
        config: true,
        type: Number,
        default: -1
      });
}


// Config Form for TUI-VTT
export class tuiConfig extends FormApplication{
    constructor(data, options){
        super(data, options);
        this.restart = false;
        this.patternSettings = [];
        this.configOpen = false;
        this.blockInteraction = true;
    }
 /**
     * Default Options for this FormApplication
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "tui-vtt_Config",
            title: game.i18n.localize("TUI-VTT.Config.Title"),
            template: "./modules/tui-vtt/templates/config.html",
            width: 700,
            height: 'auto'
        });
    }
    setConfigOpen(open){
        this.data.open = open;
    }

    getData()
    {
        this.patternSettings = game.settings.get(moduleName, 'patternSetup');
        let data = {
            blockInteraction : this.blockInteraction,
            targetName: game.settings.get(moduleName,'TargetName'),
            deselect: game.settings.get(moduleName,'deselect'),
            movementMarker: game.settings.get(moduleName,'movementMarker'),
            touchNavigation: game.settings.get(moduleName,'touchNavigation'),
            nonOwnedMovement: game.settings.get(moduleName,'EnNonOwned'),
            collision: game.settings.get(moduleName,'collisionPrevention'),
            hideElements: game.settings.get(moduleName,'HideElements'),
            touchTimeout: game.settings.get(moduleName,'touchTimeout'),
            tapTimeout: game.settings.get(moduleName,'tapTimeout'),
            touchScaleX: game.settings.get(moduleName,'touchScaleX'),
            touchScaleY: game.settings.get(moduleName,'touchScaleY'),
            zoomFactor: game.settings.get(moduleName,'zoomFactor'),
            rotationThreshold: game.settings.get(moduleName,'rotationThreshold'),

            patternSetup : this.patternSettings,
        }
        return data;
    }

    onRendered(html) {
        this.buildPatternTable();
        //Refresh browser window on close if required
        document.getElementById('tui-vtt_Config').getElementsByClassName('header-button close')[0].addEventListener('click', async event => { 
            if (this.restart) {
                const payload = {
                    msgType: "refresh"
                }
                await game.socket.emit(`module.tui-vtt`, payload);
                window.location.reload(); 
            }
        });
    }

    activateListeners(html){
        this.onRendered(html);
        super.activateListeners(html);
        const parent = this;
        // --- General settings ---
        html.find("input[id=tuiTargetName]").on('change', event =>       { this.setSettings('TargetName',event.target.value); this.restart = true; });
        html.find("input[id=tuiDeselect]").on('change', event =>         { this.setSettings('deselect',event.target.checked); });
        html.find("input[id=tuiMovementMarker]").on('change', event =>   { this.setSettings('movementMarker',event.target.checked); });
        html.find("input[id=tuiTouchNavigation]").on('change', event =>   { this.setSettings('touchNavigation',event.target.checked); });
        html.find("input[id=tuiNonOwned]").on('change', event =>         { this.setSettings('EnNonOwned',event.target.checked); });
        html.find("input[id=tuiCollision]").on('change', event =>        { this.setSettings('collisionPrevention',event.target.checked); });
        html.find("input[id=tuiHideDisplay]").on('change', event =>      { this.setSettings('HideElements',event.target.checked); this.restart = true; });
        html.find("input[id=tuiBlockInteraction]").on('change', event => { parent.blockInteraction = event.target.checked; });


         // --- Touch settings ---
         html.find("select[id=tuiTapMode]").on('change', event =>         { this.setSettings('tapMode',event.target.value); });
         html.find("input[id=tuiTouchTimeout]").on('change', event => {
             const val = event.target.value;
             html.find("input[id=tuiTouchTimeout]")[0].value = val;
             html.find("input[id=tuiTouchTimeoutNumber]")[0].value = val;
             this.setSettings('touchTimeout',val);
         });
         html.find("input[id=tuiTouchTimeoutNumber]").on('change', event => {
             const val = event.target.value;
             html.find("input[id=tuiTouchTimeout]")[0].value = val;
             html.find("input[id=tuiTouchTimeoutNumber]")[0].value = val;
             this.setSettings('touchTimeout',val);
         });
         html.find("input[id=tuiTapTimeout]").on('change', event => {
             const val = event.target.value;
             html.find("input[id=tuiTapTimeout]")[0].value = val;
             html.find("input[id=tuiTapTimeoutNumber]")[0].value = val;
             this.setSettings('tapTimeout',val);
         });
         html.find("input[id=tuiTapTimeoutNumber]").on('change', event => {
             const val = event.target.value;
             html.find("input[id=tuiTapTimeout]")[0].value = val;
             html.find("input[id=tuiTapTimeoutNumber]")[0].value = val;
             this.setSettings('tapTimeout',val);
         });
         html.find("input[id=tuiTouchScaleX]").on('change', event => {
             html.find("input[id=tuiTouchScaleXNumber]")[0].value = event.target.value;
             this.setSettings('touchScaleX', event.target.value);
         });
         html.find("input[id=tuiTouchScaleXNumber]").on('change', event => {
             html.find("input[id=tuiTouchScaleX]")[0].value = event.target.value;
             this.setSettings('touchScaleX', event.target.value);
         });
         html.find("input[id=tuiTouchScaleY]").on('change', event => {
             html.find("input[id=tuiTouchScaleYNumber]")[0].value = event.target.value;
             this.setSettings('touchScaleY', event.target.value);
         });
         html.find("input[id=tuiTouchScaleYNumber]").on('change', event => {
             html.find("input[id=tuiTouchScaleY]")[0].value = event.target.value;
             this.setSettings('touchScaleY', event.target.value);
         });
         html.find("input[id=tuiTouchZoomFactor]").on('change', event => {
             html.find("input[id=tuiTouchZoomFactorNumber]")[0].value = event.target.value;
             this.setSettings('zoomFactor', event.target.value);
         });
         html.find("input[id=tuiTouchZoomFactorNumber]").on('change', event => {
             html.find("input[id=tuiTouchZoomFactor]")[0].value = event.target.value;
             this.setSettings('zoomFactor', event.target.value);
         });
         html.find("input[id=tuiTouchRotationThreshold]").on('change', event => {
             html.find("input[id=tuiTouchRotationThresholdNumber]")[0].value = event.target.value;
             this.setSettings('rotationThreshold', event.target.value);
         });
         html.find("input[id=tuiTouchRotationThresholdNumber]").on('change', event => {
             html.find("input[id=tuiTouchRotationThreshold]")[0].value = event.target.value;
             this.setSettings('rotationThreshold', event.target.value);
         });

         // --- Pattern Setup settings, more in buildPatternTable() ---
        html.find("button[name='addPatternConfig']").on('click', async event => {
            this.patternSettings.push(
                new PatternTamplate([{x:0,y:0},{x:0,y:0},{x:0,y:0}],-1)
            )
            await this.setSettings('patternSetup',this.patternSettings);
            this.buildPatternTable();
        })

 
    }

    

    async setSettings(settingId,val,refresh=false) {
        const sett = game.settings.settings.get(`${moduleName}.${settingId}`);
        if (sett.scope == 'client' || game.user.isGM)
            return await game.settings.set(moduleName,settingId,val);
        else {
            const payload = {
                msgType: "setSettings",
                settingId,
                value: val
            }
            game.socket.emit(`module.tui_vtt`, payload);
        }
    }

    /**
     * Build the table for the Pattern data
     */
    buildPatternTable() {
        let html = '';
        for (let i=0; i<this.patternSettings.length; i++) {
            const pattern = this.patternSettings[i];
            html += `
            <div style="display:flex; width:100%">
                <input type="number" name="tuiPatternID" style="width:10%; margin-right:0.5%" id="tuiPatternID-${i}" value="${pattern.id}">
                <input type="number" name="tuiRotation" style="width:40%; margin-right:0.5%" id="tuiRotation-${i}" value="${pattern.rotationAngle}">
                <input type="number" name="tuidetectionThreshold" style="width:40%; margin-right:5%" id="tuidetectionThreshold-${i}" value="${pattern.detectionThreshold}">
                <button type="button" name="tuiSetPatternBtn" style="width:5%; margin-right:2.5%" id="tuiSetPatternBtn-${i}"><i class="fas fa-table"></i></button>
                <button type="button" name="tuiDeletePatternBtn" style="width:5%" id="tuiDeletePatternBtn-${i}"><i class="fas fa-trash"></i></button>
            </div>
            `
        }
       
        const tableElement = document.getElementById('tuiPatternList');
        tableElement.innerHTML = html;

        for (let elmnt of document.getElementsByName('tuiPatternID')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('tuiPatternID-', '');
                this.patternSettings[targetId].id = event.target.value;
                this.setSettings('patternSetup',this.patternSettings);
            })
        for (let elmnt of document.getElementsByName('tuiRotation')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('tuiRotation-', '');
                this.patternSettings[targetId].rotationAngle = event.target.value;
                this.setSettings('patternSetup',this.patternSettings);
            })
        for (let elmnt of document.getElementsByName('tuidetectionThreshold')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('tuidetectionThreshold-', '');
                this.patternSettings[targetId].detectionThreshold = event.target.value;
                this.setSettings('patternSetup',this.patternSettings);
            })
        for (let elmnt of document.getElementsByName('tuiSetPatternBtn')) 
            elmnt.addEventListener('click', async event => {
                
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('tuiSetPatternBtn-', '');
                const id = this.patternSettings[targetId].id;
                const input = await waitForPatternTouchs(id, this.patternSettings[targetId].detectionThreshold);
                if(input.id !== id) return;
                this.patternSettings[targetId] = input; // Here, "this" might not refer to the correct object
                this.setSettings('patternSetup', this.patternSettings);
                this.buildPatternTable();

            })
        for (let elmnt of document.getElementsByName('tuiDeletePatternBtn')) 
            elmnt.addEventListener('click', async event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('tuiDeletePatternBtn-', '');
                this.patternSettings.splice(targetId,1)
                await this.setSettings('patternSetup',this.patternSettings);
                this.buildPatternTable();
            })
    }
}