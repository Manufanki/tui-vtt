export const TouchType = {
    Generic: 0,
    Token: 1,
    Pattern: 2,
    Navigation: 3,
}

export class Touch{
        constructor(id,touch, type){
        this.id = id;
        this.touch = touch;
        this.startCoord = {x: touch.screenX, y: touch.screenY};
        this.touchType = type;
        this.timeout = false;
    }
    setStartCoordinates(){
        this.startCoord = {x: this.touch.screenX, y: this.touch.screenY};
        setTimeout(()=>{this.timeout = true;}, 1000);
    }

    getCoordinates(){
        return {x: this.touch.screenX, y: this.touch.screenY};
    }
}