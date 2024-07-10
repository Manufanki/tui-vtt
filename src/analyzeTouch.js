import { moduleName } from "../tui-vtt.js";
import { TouchToken } from "./Tokens/TouchToken.js";
import { PatternToken } from "./Tokens/PatternToken.js";
import { startRulerMeasurement,debug, findTokenById, findToken, removeFromArrayById, removeFromArrayByValue, averageVectorList, findCentroid, createVector,addVectors, addVectorList, normalizePattern, normalizedPatternList, getPatternById} from "./Misc/misc.js";
import { Touch , TouchType } from "./Misc/Touch.js";
import { PatternTamplate, recognizePattern, calculateRotation } from "./Pattern/PatternTamplate.js";



let Touches = [];
let TouchTokens = [];
let PatternTokens = [];
let pauseTimeoutCheck = false;
let lastMiddlePoint = -1;
let zoomHistory = [];
let startZoom = -1;
let blockedTokens = [];
let ruler = undefined
let rulerText = undefined;

export function init() {
    const user = game.user; // Get the current user
    ruler = new Ruler(user, { color: 0x00FF00});
    rulerText =  new PreciseText("",CONFIG.canvasTextStyle);
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
        getTouch(id).addToPatternStack();
        //A new Touch was pressed
        if (type == 'start')
        {   
            //startRulerMeasurement();
            getTouch(id).setStartCoordinates();

            // if only one touch is in the canvas it is a generic touch or a touchToken
            if(Touches.length == 1)
            {
                resetNavigation();
                // move token returns false if no token was found  
                if (await findTouchToken(id,coordinates,scaledCoordinates,forceNew,data)){
                    getTouch(id).touchType = TouchType.Token;
                }
                // if a touch is not a token, it is a generic touch
                else
                {
                    getTouch(id).touchType = TouchType.Generic;
                }
            }
            // if only two touches are in the canvas it is a navigation or a two touchTokens
            else if(Touches.length == 2)
            {
                if (await findTouchToken(id,coordinates,scaledCoordinates,forceNew,data)){
                    getTouch(id).touchType = TouchType.Token;
                }
                else
                {
                    // if only two generic touches are in the canvas it is a navigation
                    var genericTouches = getTouchesByType(TouchType.Generic);
                    if(genericTouches.length == 2)
                    {
                        startZoom = canvas.stage.scale._y;
                        genericTouches.forEach(nav => {
                            nav.touchType = TouchType.Navigation;
                            canvas.stage.addChild(ruler);
                            canvas.stage.addChild(rulerText);
                        });
                    }
                }
            }
            // if three touches are in the canvas it is a pattern or 3 TouchTokens
            else
            {
                resetNavigation();
                if (await findTouchToken(id,coordinates,scaledCoordinates,forceNew,data)){
                    getTouch(id).touchType = TouchType.Token;
                }
                else{
                    // var genericTouches = getTouchesByType(TouchType.Generic);
                    // var patternTouches = getTouchesByType(TouchType.Pattern);
                    // genericTouches = genericTouches.concat(patternTouches);  
                    patternRecognition(id, data,1);
                }

            }
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
                    let measureId = -1;
                    // for (let i = 0; i < navTouch.length; i++) {
                    //     let nav = navTouch[i];
                    //     var distance = calculateDistance(nav.touch.screenX,nav.touch.screenY,nav.startCoord.x,nav.startCoord.y);
                    //     if(distance < 10)
                    //     {
                    //         measureId = i;
                    //     }
                    // } 
                    if(measureId == -1) {
                        var navTouchIds = [navTouch[0].id,navTouch[1].id];
                        setTimeout (navigationTimeout,100,navTouchIds);
                    }
                    else if (measureId == 0) {
                        ruler.waypoints[0] = scaleTouchInput({x: navTouch[0].touch.screenX, y: navTouch[0].touch.screenY}); 
                        ruler.measure(scaleTouchInput({x: navTouch[1].touch.screenX, y: navTouch[1].touch.screenY}) );
                        ruler.segments.forEach(segment => {
                            segment.label = rulerText;
                            segment.label.text = segment.text;
                            segment.label.anchor.set(0.5, 0.5); // Center the text
                            segment.label.position.set(segment.ray.B.x + 10, segment.ray.B.y);
                        })
                    }
                    else if (measureId == 1) {
                        ruler.waypoints[0] = scaleTouchInput({x: navTouch[1].touch.screenX, y: navTouch[1].touch.screenY}); 
                        ruler.measure(scaleTouchInput({x: navTouch[0].touch.screenX, y: navTouch[0].touch.screenY}) );
                        ruler.segments.forEach(segment => {
                            segment.label = rulerText;
                            segment.label.text = segment.text;
                            segment.label.anchor.set(0.5, 0.5); // Center the text
                            segment.label.position.set(segment.ray.B.x + 10, segment.ray.B.y);
                        })
                    }
                    
                }
            }
            if(getTouch(id).touchType === TouchType.Generic)
            {
                patternRecognition(id, data,20);
            }
            if(getTouch(id).touchType === TouchType.Pattern)
            {
                patternUpdate(id, data);
            }
        }
        // Touch released or canceled
        else if (type == 'end') {
            // if a generic touch ends it is handled like a click to open doors
            if (getTouch(id).touchType === TouchType.Generic) 
            {
                genericTouch(type,coordinates,scaledCoordinates);
            }
            // if a token touch ends it is dropped
            else if(getTouch(id).touchType === TouchType.Token)
            {
                var tToken = GetTouchTokenById(id);
                blockedTokens = removeFromArrayByValue(blockedTokens,tToken.token);
                if(getTouch(id).timeout == false){
                    genericTouch(type,coordinates,scaledCoordinates);
                }
                if(tToken != undefined)
                {
                    await tToken.dropToken();
                    TouchTokens = removeFromArrayByValue(TouchTokens,tToken);
    
                }
            }
            // if a navigation touch ends it is stopped and the zoom is reset
            else if(getTouch(id).touchType === TouchType.Navigation)
            {
                ruler.clear();
                canvas.stage.removeChild(ruler);
                canvas.stage.removeChild(rulerText);
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
                        PatternTokens = removeFromArrayByValue(PatternTokens,pToken);
                    }
                    if(pToken.touchIds.length == 1){
                        if(pToken.moveTimeout = true){
                            pToken.token.release();
                            clearTimeout(pToken.timeoutId);
                            pToken.moveTimeout = false;
                        }
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
    var navTouches = getTouchesByType(TouchType.Navigation);
                navTouches.forEach(nav => {
                    nav.touchType = TouchType.Generic;
                });
    lastMiddlePoint = -1;
    zoomHistory = [];
}


async function patternRecognition(id, data, stackSize = 20)
{
    if(Touches.length < 3)
    {
        return false;
    }
    var touchPointI =  undefined;
    var touchPointJ =  undefined;
    var touchPointK =  undefined;

    for (let i = 0; i < Touches.length - 2; i++) {
        for (let j = i + 1; j < Touches.length - 1; j++) {
            for (let k = j + 1; k < Touches.length; k++) {
                
                touchPointI = Touches[i].getCoordinates();
                touchPointJ = Touches[j].getCoordinates();
                touchPointK = Touches[k].getCoordinates();

                var pTokens= [];
                pTokens.push(GetPatternTokenByTouchId(Touches[i].id),GetPatternTokenByTouchId(Touches[j].id),GetPatternTokenByTouchId(Touches[k].id));


                var normalized = normalizedPatternList(Touches[i].patternStack,Touches[j].patternStack,Touches[k].patternStack, stackSize);
                
                if(normalized == undefined){
                    return false;
                }
                var touchTemplate = new PatternTamplate(normalized,0); 

                var feature = touchTemplate.featureVectors[0]; 
                var patternSetup = game.settings.get(moduleName,'patternSetup');
                var patternId = undefined;
                var token = undefined;
                var templateId = 0
                var patternDifference = 1000;
                console.log("__________________________");
                console.log("Look in TOUCH id patterns");

                // Checking the patterns that are already linked to the current Touches
                pTokens.forEach(pToken => {
                    if(pToken == undefined)
                        return;
                    var result = findBestPattern(getPatternById(pToken.id),feature,patternDifference,2);
                    if (result !== undefined) {
                        patternId = result.patternId;
                        templateId = result.templateId;
                        patternDifference = result.patternDifference;
                    }
                })
                if (patternId == undefined){
                    console.log("__________________________");
                    console.log("Look in ALL patterns");
                // Checking all Patterns for the best fit
                    patternSetup.forEach(pattern => {
                        if(pattern != undefined){
                            var result = findBestPattern(pattern,feature,patternDifference);
                            if (result !== undefined) {
                                patternId = result.patternId;
                                templateId = result.templateId;
                                patternDifference = result.patternDifference;
                            }                        
                        }
                    });
                }
                if (patternId !== undefined){

                    var pattern = getPatternById(patternId);
                    var rotationAngle = calculateRotation(pattern,touchTemplate,templateId)

                    token = findTokenById(patternId)
                    if(token == undefined)
                        return false;

                    Touches[i].touchType = TouchType.Pattern;
                    Touches[j].touchType = TouchType.Pattern;
                    Touches[k].touchType = TouchType.Pattern;
                    var touchIds = [];
                    touchIds.push(Touches[i].id);
                    touchIds.push(Touches[j].id);
                    touchIds.push(Touches[k].id);



                    //Check if Token was used by another Touch
                    for (let l = 0; l < TouchTokens.length; l++) {
                        if(TouchTokens[l].token.document.id == token.document.id ||
                            TouchTokens[l].id == i || TouchTokens[l].id == j || TouchTokens[l].id == k)
                        {
                            await TouchTokens[l].dropToken();
                            if(getTouch(TouchTokens[l].id) != undefined)
                                getTouch(TouchTokens[l].id).touchType = TouchType.Generic;
                            TouchTokens = removeFromArrayByValue(TouchTokens,TouchTokens[l]);
                        }
                    }

                    for (let i = 0; i < pTokens.length; i++) {
                        if(pTokens[i] == undefined)
                            continue;
                        if(pTokens[i].id != patternId)
                        {
                            await pToken.dropToken();
                            PatternTokens = removeFromArrayById(PatternTokens,pToken);
                        }
                    }


                    blockToken(token);
                    var pToken = GetOrCreatePatternToken(patternId,token, touchIds ,pattern);
                    pToken.rotationAngle = rotationAngle;
                    
                    var position = findCentroid([touchPointI,touchPointJ,touchPointK]);
                    var scaledCenter = scaleTouchInput(position);

                    await pToken.update(position,scaledCenter,data);   
                    if (id == touchIds.includes(id)) 
                        return true;        
                }
            }
        }
    }
    
    return false;
}

function findBestPattern(pattern, feature, patternDifference, factor = 1)
{
    var featureVectors = pattern.featureVectors;
    var difference = recognizePattern(feature,featureVectors)[0];
    var templateId = recognizePattern(feature,featureVectors)[1];
    console.log("TouchDifference to pattern id "+pattern.id +" is: " +difference);
    if (difference < pattern.detectionThreshold * factor && difference < patternDifference){
        
        patternDifference = difference;
        return {
            patternId: pattern.id,
            templateId: templateId,
            patternDifference: difference
        };
    };
    return undefined;
    
}
async function patternUpdate(id, data)
{
    //find a PatternToken that is using the current touch
    var pToken = GetPatternTokenByTouchId(id);

    //if no PatternToken was found try to recognize a new pattern
    if(pToken == undefined)
    {
        return;
    }   
         
    if(pToken.touchIds.length == 3)
    {
        if(getTouch(pToken.touchIds[0]) == undefined || getTouch(pToken.touchIds[1]) == undefined || getTouch(pToken.touchIds[2]) == undefined)
            return;

        var touchTemplate = new PatternTamplate([getTouch(pToken.touchIds[0]).getCoordinates(),
                                                getTouch(pToken.touchIds[1]).getCoordinates(),
                                                getTouch(pToken.touchIds[2]).getCoordinates()],0); 

        var feature = touchTemplate.featureVectors[0]; 
        var featureVectors = pToken.initPatternTemplate.featureVectors;
        var templateId = recognizePattern(feature,featureVectors)[1];

        pToken.rotationAngle = calculateRotation(pToken.initPatternTemplate,touchTemplate,templateId)


          
        var position = findCentroid([getTouch(pToken.touchIds[0]).getCoordinates(),
                                    getTouch(pToken.touchIds[1]).getCoordinates(),
                                    getTouch(pToken.touchIds[2]).getCoordinates()]);
        var scaledCenter = scaleTouchInput(position);

        // var scaledCenter = scaleTouchInput(touchTemplate.center);

        pToken.update(touchTemplate.center,scaledCenter,data);
        //setTimeout(patternTimeout,game.settings.get(moduleName,'touchTimeout'),patternId);
    }
    else if(pToken.touchIds.length < 3){
        patternRecognition();
    }
}


async function navigationTimeout(navTouchIds)
{
    await navigation(navTouchIds);
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

async function findTouchToken(id,coordinates,scaledCoordinates,e) {
    var token = findToken(scaledCoordinates);
    if(token == undefined)
        return false;

    if(CheckIfTokenIsUsed(token)){
        return false;
    }
    var tToken = GetOrCreateTouchTokenWithId(id);
    tToken.token = token
    if(tToken.token != undefined){
        blockToken(tToken.token);
    }
    await tToken.initialize();
    return true;
    
}

async function updateTouchToken(id,coordinates,scaledCoordinates,e) {
    var tToken = GetTouchTokenById(id);
    if(tToken == undefined){
        console.log("TouchToken not found, in updateTouchToken")
        return false;
    }
    return await tToken.update(coordinates,scaledCoordinates,e);
}

function CheckIfTokenIsUsed(token){
    if(token == undefined)
        return false;
    for(var i = 0; i < blockedTokens.length; i++)
    {        
        console.log(blockedTokens[i].document.id, token.document.id)
        if(blockedTokens[i].document.id == token.document.id){
            return true;
        }
    }
}

function CheckIfBaseTokenIsUsed(pToken){
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


function GetTouchTokenByToken(token){
    var touchToken = undefined;
    TouchTokens.forEach(element => {
        if(element.token.id == token._id) 
        touchToken = element;
    });
    return touchToken;
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


export function waitForPatternTouchs(id, detectionThreshold = 0) {
    return new Promise((resolve, reject) => {
        let pointsA = [];
        let pointsB = [];
        let pointsC = [];
        const interval = setInterval(() => {
            if (Touches.length >= 3) {

                var normalized = normalizePattern([Touches[0].getCoordinates(),Touches[1].getCoordinates(),Touches[2].getCoordinates()])
                pointsA.push(normalized[0]);
                pointsB.push(normalized[1]);
                pointsC.push(normalized[2]);
            }
            if(pointsA.length > 200)
                {
                clearInterval(interval);
                var patternTemplate= new PatternTamplate([averageVectorList(pointsA),averageVectorList(pointsB),averageVectorList(pointsC)], id);
                patternTemplate.detectionThreshold = detectionThreshold;
                resolve(patternTemplate, );
                pointsA = [];
                pointsB = [];
                pointsC = [];
            }
        }, 10);
    });
}
