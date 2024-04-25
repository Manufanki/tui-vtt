import { moduleName } from "../tui-vtt.js";
import { TouchToken } from "./Tokens/TouchToken.js";
import { PatternToken } from "./Tokens/PatternToken.js";
import { debug, findTokenById, findToken} from "./Misc/misc.js";
import { Touch , TouchType } from "./Misc/Touch.js";
import { PatternTamplate, recognizeTriangle, calculateRotation } from "./Triangle/PatternTamplate.js";


let Touches = [];
let TouchTokens = [];
let PatternTokens = [];
let tapTimeout = [];
let pauseTimeoutCheck = false;
let lastMiddlePoint = -1;
let zoomHistory = [];
let startZoom = -1;

export function initializeTuiTokens(){
    //for (let i=0; i<40; i++) TuiTokens[i] = new TuiToken();
}

export function waitForPatternTouchs(id, detectionThreshold = 0) {
    return new Promise((resolve, reject) => {

        const interval = setInterval(() => {
            if (Touches.length >= 3) {
                clearInterval(interval);
                var patternTemplate = new PatternTamplate([Touches[0].getCoordinates(),Touches[1].getCoordinates(),Touches[2].getCoordinates()], id);
                patternTemplate.detectionThreshold = detectionThreshold;
                resolve(patternTemplate, );
            } 
            else {
              // Do nothing if the user cancels the input
            }
          }, 10);

        
    });
}

export async function analyzeTouch(type,data) {
    if (game.paused) {
        if (!pauseTimeoutCheck) {
            ui.notifications.warn("TUI-VTT: "+game.i18n.localize("GAME.PausedWarning"));
            pauseTimeoutCheck = true;
            setTimeout(function(){pauseTimeoutCheck = false},1000)
        }
        return;
    }
    const changedTouches = data.changedTouches;

    // Changes in the touches
    for (let touch of changedTouches) {
        //search for the id in touches
        // Fills the Touches Array with Touchobjects
        if(Touches.some(t => t.id == touch.identifier)) {
            const index = Touches.findIndex(t => t.id == touch.identifier);
            Touches[index].touch = touch;
        }
        else {
            Touches.push(new Touch(touch.identifier,touch,TouchType.Generic));
        }
        let id = touch.identifier; 
        const coordinates = {x: touch.screenX, y: touch.screenY};
        const scaledCoordinates = scaleTouchInput(coordinates);
        const forceNew = type == 'start';

        //Touch pressed
        if (type == 'start')
        {   
            getTouch(id).setStartCoordinates;
            // move token returns false if no token was found  
            if (await updateTouchToken(id,coordinates,scaledCoordinates,forceNew,data)){
                getTouch(id).touchType = TouchType.Token;
            }
            else
            {
                // if a touch is not a token, it is a generic touch
                // if only two generic touches are in the canvas it is a navigation
                var navTouches = getTouchesByType(TouchType.Generic);
                if(navTouches.length == 2)
                {
                    startZoom = canvas.stage.scale._y;
                    navTouches.forEach(nav => {
                        nav.touchType = TouchType.Navigation;
                    });
                }
                else
                {  
                    // if a third touch appears the navigation is stopped
                    resetNavigation();
                    var navTouches = getTouchesByType(TouchType.Navigation);
                    navTouches.forEach(nav => {
                        nav.touchType = TouchType.Generic;
                    });
                    getTouch(id).touchType = TouchType.Generic;
                    var genericTouches = getTouchesByType(TouchType.Generic);
                    patternRecognition(genericTouches, forceNew, data);
                }
        
            }
            //setTimeout(tapDetect,game.settings.get(moduleName,'tapTimeout'),{id,coordinates,scaledCoordinates,forceNew,data}); 

        }
        else if (type == 'move')
        {
            // if a token touch is moved it is moved
            if (getTouch(id).touchType === TouchType.Token) {
                await updateTouchToken(id,coordinates,scaledCoordinates,forceNew,data);
            }
            // if a two navigation touches are in the canvas the navigation logic is called 
            if (getTouch(id).touchType === TouchType.Navigation) {
                var navTouch = getTouchesByType(TouchType.Navigation);
                if(navTouch.length == 2)
                {
                    var navTouchIds = [navTouch[0].id,navTouch[1].id];
                    setTimeout (navigationTimeout,100,navTouchIds);
                }
            }
            if(getTouch(id).touchType === TouchType.Pattern)
            {

                var patternTouches = getTouchesByType(TouchType.Pattern);
                patternRecognition(patternTouches, forceNew, data);
                
            }
        }
        // Touch released or canceled
        else if (type == 'end') {
            clearTimeout(tapTimeout[id]);
            // if a generic touch ends it is handled like a click to open doors
            if (getTouch(id).touchType === TouchType.Generic) 
            {
                genericTouch(type,coordinates,scaledCoordinates);
            }
            // if a token touch ends it is dropped
            else if(getTouch(id).touchType === TouchType.Token)
             {
                GetTouchTokenById(id).dropToken();
            }
            // if a navigation touch ends it is stopped and the zoom is reset
            else if(getTouch(id).touchType === TouchType.Navigation)
            {
                resetNavigation();
            }
            else if(getTouch(id).touchType === TouchType.Pattern)
            {
                var pToken = undefined;
                PatternTokens.forEach(ptoken => {
                   ptoken.patternTouchIds.forEach(pId => {
                     if(pId == id){
                        pToken = ptoken;
                        return;
                     }
                   });
                })
                if(pToken != undefined)
                {
                    var pIds = pToken.patternTouchIds;
                    pIds.forEach(pId => {
                        if(getTouch(pId) != undefined)
                            getTouch(pId).touchType = TouchType.Generic;
                    })
                    pToken.dropToken();
                    removeFromArrayById(PatternTokens,pToken.id);
                }
            }

            Touches = removeFromArrayById(Touches,id);        //deletes the Touch Object from the array
        }
       
    }
}


function resetNavigation(){
    lastMiddlePoint = -1;
    zoomHistory = [];
}

async function patternRecognition(patternTouches, forceNew, data)
{
    if(patternTouches.length == 3)
    {
        var touchTemplate = new PatternTamplate([patternTouches[0].getCoordinates(),patternTouches[1].getCoordinates(),patternTouches[2].getCoordinates()],0); 

        var feature = touchTemplate.featureVectors[0]; 
        var patternSetup = game.settings.get(moduleName,'patternSetup');
        var patternId = undefined;
        var rotationAngle = 0;
        var token = undefined;
        patternSetup.forEach(pattern => {
            if(pattern != undefined){
                var pId = pattern.id;
                var featureVectors = pattern.featureVectors;

                var difference = recognizeTriangle(feature,featureVectors)[0];
                var templateId = recognizeTriangle(feature,featureVectors)[1];
                if (difference < pattern.detectionThreshold){
                    token = findTokenById(pId)
                    patternId = pId;
                    rotationAngle = calculateRotation(pattern,touchTemplate,templateId)
                    return;
                };
            }
        });
        if (patternId !== undefined){
            var patternTouchIds = [];
            patternTouches.forEach(genericTouch => {
                genericTouch.touchType = TouchType.Pattern;
                patternTouchIds.push(genericTouch.id);
            });
            var scaledCenter = scaleTouchInput(touchTemplate.center);
            if(CheckIfTokenIsUsed(token,TouchTokens))
                return;
            GetOrCreatePatternToken(patternId,token, patternTouchIds);
            await updatePatternToken(patternId,touchTemplate.center,scaledCenter,rotationAngle,patternTouchIds,forceNew,data);
            //setTimeout(patternTimeout,game.settings.get(moduleName,'touchTimeout'),patternId);
            
        }
    }
}


async function navigationTimeout(navTouchIds)
{
    await navigation(navTouchIds);
}
function touchTimeout(id) {
    debug('dropToken','Touch timeout passed, dropping token');
    GetTouchTokenById(id).dropToken();
    TouchTokens = removeFromArrayById(TouchTokens, id);
}

function removeFromArrayById(array, id){
    if(array.some(t => t.id == id)) {
        const index = array.findIndex(t => t.id == id);
        array.splice(index,1);
    }
    return array;
}


function getTouchesByType(type){
    var touches = [];
    Touches.forEach(t => {
        if(t.touchType === type) touches.push(t);
    });

    return touches;
}



function getTouch(id){
    if(Touches.some(t => t.id == id)) {
        const index = Touches.findIndex(t => t.id == id);
        return Touches[index];
    }
    return undefined;
}


async function tapDetect(data) {
    debug('tapDetect','Tap Timeout passed, allowing token movement')
    await updateTouchToken(data.id,data.coordinates,data.scaledCoordinates,data.forceNew,data.data)

}
async function updateTouchToken(id,coordinates,scaledCoordinates,forceNew,e) {
    var tToken = GetOrCreateTouchTokenWithId(id);
    tToken.token = findToken(scaledCoordinates);
    if(CheckIfTokenIsUsed(tToken,PatternTokens)){
        return false;
    }
    return await tToken.update(coordinates,scaledCoordinates,forceNew,e);
}
async function updatePatternToken(id,coordinates,scaledCoordinates, rotationAngle,patternTouchIds, forceNew,e) {
    var token = GetPatternTokenById(id);
    token.patternTouchIds = patternTouchIds;
    token.rotationAngle = rotationAngle;
    return await token.update(coordinates,scaledCoordinates,forceNew,e);
}


function CheckIfTokenIsUsed(pToken, tokenList){
    if(pToken === undefined)
        return false;
    var pTokenActorId = undefined;
    try{
        pTokenActorId = pToken.document.actorId;
    }
    catch{}
    for (var i = 0; i < tokenList.length; i++) {
        var tokenActorId = undefined;
        try{
            tokenActorId = tokenList[i].token.document.actorId;
        }
        catch{}
        if(pTokenActorId == tokenActorId && tokenActorId != undefined)
            return true;
    }
    return false;
}

function GetTouchTokenById(id)
{
    var touchToken = undefined;
    TouchTokens.forEach(element => {
        if(element.id == id) 
        touchToken = element;
    });
    return touchToken;
}

function GetOrCreateTouchTokenWithId(id){
    var touchToken = GetTouchTokenById(id);
    if(touchToken == undefined)
    {  
        touchToken =  new TouchToken(id)
        TouchTokens.push(touchToken);
    } 
     return touchToken;
}

function GetPatternTokenById(id)
{
    var patternToken = undefined;
    PatternTokens.forEach(element => {
        if(element.id == id) 
            patternToken = element;
    });
     return patternToken;
}

function GetOrCreatePatternToken(id, token, patternTouchIds){
    var patternToken = GetPatternTokenById(id);
    if(patternToken == undefined)
    {  
        patternToken =  new PatternToken(id, token,patternTouchIds)
        PatternTokens.push(patternToken);
    } 
     return patternToken;
}

async function navigation(navTouchIds) {
    
    if(Touches.length != 2){
        resetNavigation();
        return;
    }

    var touch0 = getTouch(navTouchIds[0]);
    if (touch0 == false) return;
    var touch1 = getTouch(navTouchIds[1]);
    if (touch1 == false) return;

    let zoomFactor = game.settings.get(moduleName,'zoomFactor');

    let start0x = getTouch(navTouchIds[0]).startCoord.x;
    let start0y = getTouch(navTouchIds[0]).startCoord.y;
    let start1x = getTouch(navTouchIds[1]).startCoord.x;
    let start1y = getTouch(navTouchIds[1]).startCoord.y;

    let touch0x = getTouch(navTouchIds[0]).touch.screenX;
    let touch0y = getTouch(navTouchIds[0]).touch.screenY;
    let touch1x = getTouch(navTouchIds[1]).touch.screenX;
    let touch1y = getTouch(navTouchIds[1]).touch.screenY;

    let startMiddlePoint = {x: start0x + start1x / 2,
        y:start0y + start1y / 2};

        let currentMiddlePoint = {x:touch0x + touch1x / 2,
        y:touch0y + touch1y / 2};


    let distanceStart = (calculateDistance(start0x, start0y, start1x , start1y)/100);
    let distance = (calculateDistance(touch0x, touch0y, touch1x,touch1y)/100);
    
    if(zoomHistory.length > 20) zoomHistory.shift();
    
    zoomHistory.push(distance);
    
    distance = 0;
    for (const dist of zoomHistory) {
        distance += dist;
    }
    
    distance = distance / zoomHistory.length;

    var difference = distance - distanceStart;
    var zoom = 0;
    if(Math.abs(difference) <1){
        var a = 1;
        if(distance -distanceStart < 0)
            a = -1;
        zoom = startZoom + a * Math.pow(Math.abs(difference),2)* zoomFactor;
    }
    else
        zoom = startZoom + difference* zoomFactor;
    
    if(zoom > 3)
        zoom = 3;
    else if(zoom < .1)
        zoom = .1;

    var zoomLevel =canvas.stage.scale._x;
    zoomLevel = (1-zoomLevel /3)

    if(zoomLevel < .1)
        zoomLevel = .15;

    if(lastMiddlePoint === -1){
        lastMiddlePoint = startMiddlePoint;
    }

    var panX = canvas.stage.pivot._x + (lastMiddlePoint.x - currentMiddlePoint.x) *zoomLevel;
    var panY = canvas.stage.pivot._y + (lastMiddlePoint.y - currentMiddlePoint.y) *zoomLevel;
    
    canvas.pan({x : panX, y : panY, scale : zoom});
    lastMiddlePoint = {x:currentMiddlePoint.x,y:currentMiddlePoint.y};
    
}

function scaleTouchInput(coords) {
    //Calculate the amount of pixels that are visible on the screen
    const horVisible = game.settings.get(moduleName, 'touchScaleX')*screen.width/canvas.scene._viewPosition.scale;
    const vertVisible = game.settings.get(moduleName, 'touchScaleY')*screen.height/canvas.scene._viewPosition.scale;

    //Calculate the scaled coordinates
    const posX = (coords.x/screen.width)*horVisible+canvas.scene._viewPosition.x-horVisible/2;
    const posY = (coords.y/screen.height)*vertVisible+canvas.scene._viewPosition.y-vertVisible/2;

    //Return the value
    return {x:Math.round(posX),y:Math.round(posY)};
}

function genericTouch(type,coordinates,scaledCoordinates) {
    let element = document.elementFromPoint(coordinates.x,coordinates.y);
    if (element == null) {
        if (type == 'end') 
        checkDoorClick(scaledCoordinates);
    }
    else if (element?.id == 'board') {
        if (type == 'end') {
            checkDoorClick(scaledCoordinates);
        }
        else {
            canvas.tokens.releaseAll();
            debug('tapDetect', `Tapped on canvas, releasing all tokens`)
        }
    }
}

function calculateDistance(x1, y1, x2, y2) {
    const deltaX = x2 - x1;
    const deltaY = y2 - y1;
  
    // Use the Pythagorean theorem to calculate the distance
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
    return distance;
  }

function checkDoorClick(data) {
    const doors = canvas.walls.doors;

    for (let door of doors) {
        if(door.doorControl === undefined){
            continue;
        }

        const position = door.doorControl.position;
        const hitArea = door.doorControl.hitArea;
        const widthDifference = Math.abs(data.x - position.x - hitArea.width/2)
        const heightDifference = Math.abs(data.y - position.y - hitArea.height/2)

        if (widthDifference <= hitArea.width &&  heightDifference <= hitArea.height) {
            const event = {
                data: {
                    originalEvent: {
                        button: 0
                    }
                },
                stopPropagation: event => {return;}
            }
            debug('tapDetect', `Door tapped`)
            door.doorControl._onMouseDown(event);
        }
    }
}
