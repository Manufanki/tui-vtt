import { moduleName } from "../../tui-vtt.js";

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

    /**
     * Sets the size of the pen menu relative to the grid size
     */
    game.settings.register(moduleName, 'MenuSize', {
        default: 2.5,
        type: Number,
        scope: 'world',
        range: { min: 0, max: 5, step: 0.1 },
        config: false
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
}


// Config Form for TUI-VTT
export class tuiConfig extends FormApplication{
    constructor(data, options){
        super(data, options);
        this.restart = false;
        this.baseSettings = [];
        this.configOpen = false;
        this.blockInteraction = true;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "TUI-VTT_Config",
            title: game.i18n.localize("TUI-VTT.Config.Title"),
            template: "./modules/tui-vtt/templates/config.html",
            with: 700,
            height: 'auto'
        });
    }
    
    setConfigOpen(open){
        this.data.open = open;
    }

    getData()
    {
        //this.baseSettings = game.settings.get(moduleName, 'baseSetup');
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

            //baseSetup : this.baseSettings,
        }
        return data;
    }

    onRendered(html) {
        //Refresh browser window on close if required
        document.getElementById('TUI-VTT_Config').getElementsByClassName('header-button close')[0].addEventListener('click', async event => { 
            if (this.restart) {
                const payload = {
                    msgType: "refresh"
                }
                await game.socket.emit(`module.TUI-VTT`, payload);
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
            game.socket.emit(`module.TUI-VTT`, payload);
        }
    }
}