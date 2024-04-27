import { moduleName } from "../tui-vtt.js";
import { TouchToken } from "./Tokens/TouchToken.js";
import { PatternToken } from "./Tokens/PatternToken.js";
import { debug, findTokenById, findToken, removeFromArrayById, removeFromArrayByValue, findCentroid, createVector,addVectors} from "./Misc/misc.js";
import { Touch , TouchType } from "./Misc/Touch.js";
import { PatternTamplate, recognizePattern, calculateRotation } from "./Pattern/PatternTamplate.js";


let Touches = [];
let TouchTokens = [];
let PatternTokens = [];
let tapTimeout = [];
let pauseTimeoutCheck = false;
let lastMiddlePoint = -1;
let zoomHistory = [];
let startZoom = -1;
let blockedTokens = [];

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
            if (await findTouchToken(id,coordinates,scaledCoordinates,forceNew,data)){
                getTouch(id).touchType = TouchType.Token;
            }
            else
            {
                // if a touch is not a token, it is a generic touch
                // if only two generic touches are in the canvas it is a navigation
                var navTouches = getTouchesByType(TouchType.Generic);
                if(navTouches.length == 2 && Touches.length == 2)
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
                    var patternTouches = getTouchesByType(TouchType.Pattern);
                    if(patternTouches.length < 3)
                        genericTouches = genericTouches.concat(patternTouches);                    
                    patternRecognition(genericTouches, data);
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
                patternUpdate(patternTouches, data);
                
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
                var pToken = GetTouchTokenById(id);
                blockedTokens = removeFromArrayByValue(blockedTokens,pToken.token);
                await pToken.dropToken();
            }
            // if a navigation touch ends it is stopped and the zoom is reset
            else if(getTouch(id).touchType === TouchType.Navigation)
            {
                resetNavigation();
            }
            else if(getTouch(id).touchType === TouchType.Pattern)
            {
                var pToken = GetPatternTokenByTouchId(id);
                if(pToken != undefined)
                {
                    pToken.touchIds = removeFromArrayByValue(pToken.touchIds,id);
                    
                    if(pToken.touchIds.length == 0)
                    {
                        blockedTokens = removeFromArrayByValue(blockedTokens,pToken.token);
                        await pToken.dropToken();
                        removeFromArrayById(PatternTokens,pToken.id);
                    }
                }
            }

            Touches = removeFromArrayById(Touches,id);        //deletes the Touch Object from the array
        }
       
    }
}

function blockToken(token){
    for (var i = 0; i < blockedTokens.length; i++) {
        if(blockedTokens[i].document.id == token.document.id)
            return;
    }
    blockedTokens.push(token);
}

function resetNavigation(){
    lastMiddlePoint = -1;
    zoomHistory = [];
}


async function patternRecognition(patternTouches, data)
{
    if(patternTouches.length == 3)
    {
        var touchTemplate = new PatternTamplate([patternTouches[0].getCoordinates(),patternTouches[1].getCoordinates(),patternTouches[2].getCoordinates()],0); 

        var feature = touchTemplate.featureVectors[0]; 
        var patternSetup = game.settings.get(moduleName,'patternSetup');
        var patternId = undefined;
        var rotationAngle = 0;
        var token = undefined;
        var initPatternTemplate = undefined;
        var templateId = 0

        patternSetup.forEach(pattern => {
            if(pattern != undefined){
                var pId = pattern.id;
                var featureVectors = pattern.featureVectors;

                var difference = recognizePattern(feature,featureVectors)[0];
                templateId = recognizePattern(feature,featureVectors)[1];
                if (difference < pattern.detectionThreshold){
                    token = findTokenById(pId)
                    patternId = pId;
                    rotationAngle = calculateRotation(pattern,touchTemplate,templateId)
                    initPatternTemplate = pattern;
                    return;
                };
            }
        });
        if (patternId !== undefined){
            var touchIds = [];
            patternTouches.forEach(genericTouch => {
                genericTouch.touchType = TouchType.Pattern;
                touchIds.push(genericTouch.id);
            });
            var scaledCenter = scaleTouchInput(touchTemplate.center);


            TouchTokens.forEach(tToken => {
                if(tToken.token == undefined)
                    return;
                if(tToken.token.document.id == token.document.id){
                    tToken.dropToken();
                    TouchTokens = removeFromArrayById(TouchTokens,tToken.id);
                }
            });

            blockToken(token);
            var pToken = GetOrCreatePatternToken(patternId,token, touchIds ,initPatternTemplate);
            pToken.rotationAngle = rotationAngle;
            
            await pToken.update(touchTemplate.center,scaledCenter,data);            
        }
    }
}

async function patternUpdate(patternTouches, data)
{

    var pToken = undefined
    //find a PatternToken that is using one of the patternTouches
    patternTouches.forEach(pTouch => {
        pToken = GetPatternTokenByTouchId(pTouch.id);
    });
    //if no PatternToken was found try to recognize a new pattern
    if(pToken == undefined)
    {
        patternRecognition(patternTouches,data);
        return;
    }    
    
    if(patternTouches.length == 3)
    {
        var touchTemplate = new PatternTamplate([patternTouches[0].getCoordinates(),patternTouches[1].getCoordinates(),patternTouches[2].getCoordinates()],0); 

        var feature = touchTemplate.featureVectors[0]; 
        var featureVectors = pToken.initPatternTemplate.featureVectors;
        var templateId = recognizePattern(feature,featureVectors)[1];

        pToken.rotationAngle = calculateRotation(pToken.initPatternTemplate,touchTemplate,templateId)

        var scaledCenter = scaleTouchInput(touchTemplate.center);

        await pToken.update(touchTemplate.center,scaledCenter,data);
        //setTimeout(patternTimeout,game.settings.get(moduleName,'touchTimeout'),patternId);
            
        
    }
    if(patternTouches.length == 2){
        var points = [];
        patternTouches.forEach(genericTouch => {
            points.push(genericTouch.getCoordinates());
        })
        var center = findCentroid(points)

        // let tokenPos =  {x: pToken.currentPosition.x+canvas.dimensions.size/2, y:pToken.currentPosition.y+canvas.dimensions.size/2};

        // var offset = createVector(center, tokenPos); 
        //center = addVectors(center,offset)
        var scaledCenter = scaleTouchInput(center);


        await pToken.update(center,scaledCenter,data);
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

async function findTouchToken(id,coordinates,scaledCoordinates,forceNew,e) {
    var tToken = GetOrCreateTouchTokenWithId(id);
    tToken.token = findToken(scaledCoordinates);
    if(tToken.token != undefined){
        if(CheckIfTokenIsUsed(tToken)){
            return false;
        }
        blockToken(tToken.token);
    }
    return await tToken.update(coordinates,scaledCoordinates,forceNew,e);
}

async function updateTouchToken(id,coordinates,scaledCoordinates,forceNew,e) {
    var tToken = GetOrCreateTouchTokenWithId(id);
    tToken.token = findToken(scaledCoordinates);
    return await tToken.update(coordinates,scaledCoordinates,forceNew,e);
}

function CheckIfTokenIsUsed(pToken){

    if(pToken.token == undefined)
        return false;
    for(var i = 0; i < blockedTokens.length; i++)
    {        
        console.log(blockedTokens[i].document.id, pToken.token.document.id)
        if(blockedTokens[i].document.id == pToken.token.document.id){
            return true;
        }
    }
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

function GetPatternTokenByTouchId(id)
{
    var patternToken = undefined;
    PatternTokens.forEach(pToken => {
        pToken.touchIds.forEach(tId => {
            if(tId == id) 
                patternToken = pToken;
        });
        
    });
     return patternToken;
}

function GetOrCreatePatternToken(id, token, touchIds, patternTemplate){
    var patternToken = GetPatternTokenById(id);
    if(patternToken == undefined)
    {  
        patternToken =  new PatternToken(id, token,touchIds, patternTemplate)
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
    if (touch0 == undefined) return;
    var touch1 = getTouch(navTouchIds[1]);
    if (touch1 == undefined) return;

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
