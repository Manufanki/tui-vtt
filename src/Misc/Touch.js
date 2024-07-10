export const TouchType = {
    Generic: 0,
    Token: 1,
    Pattern: 2,
    Navigation: 3,
    Measure: 4
}

export class Touch{
        constructor(id,touch, type){
        this.id = id;
        this.touch = touch;
        this.startCoord = {x: touch.screenX, y: touch.screenY};
        this.touchType = type;
        this.timeout = false;
        this.patternStack = [];
    }
    setStartCoordinates(){
        this.startCoord = {x: this.touch.screenX, y: this.touch.screenY};
        setTimeout(()=>{this.timeout = true;}, 1000);
    }

    getCoordinates(){
        return {x: this.touch.screenX, y: this.touch.screenY};
    }

    addToPatternStack()
    {
        if(this.patternStack.length > 20) this.patternStack.shift();
            this.patternStack.push(this.getCoordinates());  
    }
}