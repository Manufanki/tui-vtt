import { moduleName } from "../tui-vtt.js";
import { TouchToken } from "./TouchToken/TouchToken.js";
import { debug } from "./Misc/misc.js";

let TouchTokens = [];
let timeout = [];
let tokenActive = [];
let tapTimeout = [];
let touches = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];
let navTouchIds = [];
let touchStartCoord = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];
let touchCoord = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];
let pauseTimeoutCheck = false;
let lastMiddlePoint = -1;
let zoomHistory = [];
let startZoom = -1;

export function initializeTouchTokens(){
    for (let i=0; i<40; i++) TouchTokens[i] = new TouchToken();
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

    // Changes in the number of touches
    for (let touch of changedTouches) {
        let id = touches.findIndex(t => t == touch.identifier);
        if (id == -1) {
            id = touches.findIndex(t => t == -1);
            touches[id] = touch.identifier;
        }

        const coordinates = {x: touch.screenX, y: touch.screenY};
        const scaledCoordinates = scaleTouchInput(coordinates);
        debug('touchDetect', `${type}, id: ${id}, Coordinates: (${coordinates.x}, ${coordinates.y}), Scaled: (${scaledCoordinates.x}, ${scaledCoordinates.y})`);
        const forceNew = type == 'start';
        const zoomFactor = game.settings.get(moduleName ,'zoomFactor')*0.1;
        const touchNavigation = game.settings.get(moduleName,'touchNavigation');

        if (type == 'end') {
            touchStartCoord[id] = -1;
            touchCoord[id] = -1;
            lastMiddlePoint = -1;
            zoomHistory = [];
            navTouchIds = navTouchIds.filter(function(item){return item !== id});
            clearTimeout(tapTimeout[id]);
            if (!tokenActive[id]) 
                genericTouch(type,coordinates,scaledCoordinates);
            else{
                tokenActive[id] = false;
                dropTouchToken(id);
            }
        }
        else if (type == 'start')
        {    
            tapTimeout[id] = setTimeout(tapDetect,game.settings.get(moduleName,'tapTimeout'),{id,coordinates,scaledCoordinates,forceNew,data}); 
            touchStartCoord[id] = coordinates;
            touchCoord[id] = coordinates;
            if(id === 2){
                console.log("TEST"); 
             }
             else
                 startZoom = canvas.stage.scale._y;
        }
        else if (tokenActive[id]) {
            touchCoord[id] = coordinates;
            if(touchNavigation){
                

                if(!await navigation(id,coordinates,scaledCoordinates,forceNew,zoomFactor))
                {
                    if(await moveToken(id,coordinates,scaledCoordinates,forceNew,data))
                    {
                        navTouchIds = navTouchIds.filter(function(item){return item !== id});
                    }
                }
            }
            else{
                await moveToken(id,coordinates,scaledCoordinates,forceNew,data);
            }
            
        }
    }
}



async function tapDetect(data) {
    debug('tapDetect','Tap Timeout passed, allowing token movement')
    tokenActive[data.id] = true; 
    await moveToken(data.id,data.coordinates,data.scaledCoordinates,data.forceNew,data.data);
}

async function moveToken(id,coordinates,scaledCoordinates,forceNew,e) {
    return await TouchTokens[id].update(coordinates,scaledCoordinates,forceNew,e);
}


async function navigation(id,coordinates,scaledCoordinates,forceNew,zoomFactor) {
    if(!navTouchIds.includes(id))
        navTouchIds.push(id);


    // Zooming
    if(navTouchIds.length == 2)
    {
        let startMiddlePoint = {x:touchStartCoord[navTouchIds[0]].x + touchStartCoord[navTouchIds[1]].x / 2,
         y:touchStartCoord[navTouchIds[0]].y + touchStartCoord[navTouchIds[1]].y / 2};

         let currentMiddlePoint = {x:touchCoord[navTouchIds[0]].x + touchCoord[navTouchIds[1]].x / 2,
         y:touchCoord[navTouchIds[0]].y + touchCoord[navTouchIds[1]].y / 2};


        let distanceStart = (calculateDistance(touchStartCoord[navTouchIds[0]].x, touchStartCoord[navTouchIds[0]].y,
            touchStartCoord[navTouchIds[1]].x , touchStartCoord[navTouchIds[1]].y)/100);
        let distance = (calculateDistance(touchCoord[navTouchIds[0]].x, touchCoord[navTouchIds[0]].y,
            touchCoord[navTouchIds[1]].x,touchCoord[navTouchIds[1]].y)/100);
        
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
        return true;
    }
    return false;
}

function touchTimeout(id) {
    debug('dropToken','Touch timeout passed, dropping token');
    dropTouchToken(id);
}

function dropTouchToken(id=0) {
    clearTimeout(timeout[id]);
    timeout[id] = undefined;
    TouchTokens[id].dropTouchToken();
    tokenActive[id] = false;
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
