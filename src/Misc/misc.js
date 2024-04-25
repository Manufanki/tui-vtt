import {moduleName} from '../../tui-vtt.js';
import { PatternFlags } from './PatternFlags.js';

let debugSettings = {
    wsRaw: false,
    ws: false,
    touchDetect: false,
    tapDetect: false,
    nearestToken: false,
    updateMovement: false,
    moveToken: false,
    dropToken: false
  };
  
  export function configureDebug(data) {
    for (const [key,value] of Object.entries(data)) {
      debugSettings[key] = value;
    }
    console.log(`TUI Debug - Configured to`,debugSettings)
  }
  
  export function debug(type, message) {
    if (debugSettings?.[type]) console.log(`TUI Debug - ${type} - `, message)
  }
  
  export function compareVersions(checkedVersion, requiredVersion) {
    requiredVersion = requiredVersion.split(".");
    checkedVersion = checkedVersion.split(".");
    
    for (let i=0; i<3; i++) {
        requiredVersion[i] = isNaN(parseInt(requiredVersion[i])) ? 0 : parseInt(requiredVersion[i]);
        checkedVersion[i] = isNaN(parseInt(checkedVersion[i])) ? 0 : parseInt(checkedVersion[i]);
    }
    
    if (checkedVersion[0] > requiredVersion[0]) return false;
    if (checkedVersion[0] < requiredVersion[0]) return true;
    if (checkedVersion[1] > requiredVersion[1]) return false;
    if (checkedVersion[1] < requiredVersion[1]) return true;
    if (checkedVersion[2] > requiredVersion[2]) return false;
    return true;
  }
  
export function compatibleCore(compatibleVersion){
    const split = compatibleVersion.split(".");
    if (split.length == 2) compatibleVersion = `0.${compatibleVersion}`;
    let coreVersion = game.version == undefined ? game.data.version : `0.${game.version}`;
    return compareVersions(compatibleVersion, coreVersion);
  }

  export function findToken(coords, spacing, currentToken){

    if (spacing == undefined) {
      spacing = compatibleCore('10.0') ? canvas.scene.grid.size : canvas.scene.data.grid;
    }
  
    //For all tokens on the canvas: get the distance between the token and the coordinate. Get the closest token. If the distance is smaller than the hitbox of the token, 'token' is returned
    let closestToken = undefined;
    let minDistance = 1000;

    for (let token of canvas.tokens.placeables){
        if (currentToken == token) continue;
        if (!token.can(game.user,"control")) {
          if (!game.settings.get(moduleName,'EnNonOwned') || !token.visible) continue;
        }
        let coordsCenter = token.getCenter(token.x, token.y);
        const dx = Math.abs(coordsCenter.x - coords.x);
        const dy = Math.abs(coordsCenter.y - coords.y);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
            minDistance = distance;
            closestToken = token;
        }
    }
    if (minDistance < spacing) 
        return closestToken;
    else
        return undefined;
}
export function findTokenById(id){

  for (let token of canvas.tokens.placeables){
      if (!token.can(game.user,"control")) {
        if (!game.settings.get(moduleName,'EnNonOwned') || !token.visible) continue;
      }
      if(PatternFlags.PatternId(token.document) == id){
        return token
      }
  }
  return undefined;
}
/*
 * tokenMarker draws a rectangle at the target position for the token
 */
export class tokenMarker extends CanvasLayer {
    constructor() {
      super();
      this.init();
    }
  
    init() {
      this.container = new PIXI.Container();
      this.addChild(this.container);
    }
  
    async _draw() {

    }

    async draw() {
      super.draw();
    }
  
    /*
     * Update the marker position, size and color
     */
    updateMarker(data) {
        const width = data.width;
        const height = data.height;
        const x = data.x - Math.floor(data.width/2);
        const y = data.y - Math.floor(data.height/2);
        
    
        this.container.removeChildren();
        var drawing = new PIXI.Graphics();
        drawing.lineStyle(2, data.color, 1);
        //drawing.beginFill('#FF0000');
        drawing.drawRect(0,0,width,height);
        this.container.addChild(drawing);
      
      this.container.setTransform(x, y);
      this.container.visible = true;
    }
    
    /*
     * Hide the marker
     */
    hide() {
      this.container.visible = false;
    }
  
    /*
     * Show the marker
     */
    show() {
      this.container.visible = true;
    }
  
    /*
     * Remove the marker
     */
    remove() {
      this.container.removeChildren();
    }
  }
