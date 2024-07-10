import { moduleName } from "../../tui-vtt.js";
import { BaseToken } from "./BaseToken.js";

export class TouchToken extends BaseToken{
    constructor(id, token = undefined) {
        super(id, token);
        this.rotationPosition;
        this.rotationThreshold;
        this.rotationHistory = [];
        this.currentField = {x:0,y:0};
    }


    initialize(){
        this.rotationThreshold = game.settings.get(moduleName,'rotationThreshold');
        this.currentPosition = {x:this.token.x+canvas.dimensions.size/2, y:this.token.y+canvas.dimensions.size/2}
        this.previousPosition = this.currentPosition;
        this.controlledToken = this.token;
        this.originPosition = {x:this.token.x, y:this.token.y};
    }


    async rotateToken(coords, currentPos){
        // Rotate the token
        if(!this.token.document.lockRotation){
            if (this.rotationPosition == undefined) this.rotationPosition = coords;
            if(Math.abs(this.rotationPosition.x - coords.x) > this.rotationThreshold || Math.abs(this.rotationPosition.y - coords.y) > this.rotationThreshold)
            {

                var differenceX = this.rotationPosition.x - coords.x;
                var differenceY = this.rotationPosition.y - coords.y;
                var angleRadians = Math.atan2(differenceY , differenceX);
                
                if(this.rotationHistory.length > 20) this.rotationHistory.shift();
                this.rotationHistory.push(angleRadians);

                let sumSines = 0;
                let sumCosines = 0;
                for (const angle of this.rotationHistory) {
                    sumSines += Math.sin(angle);
                    sumCosines += Math.cos(angle);
                }
                
                var averageSine = sumSines / this.rotationHistory.length;
                var averageCosine = sumCosines / this.rotationHistory.length;
                
                // Calculate the average angle in radians and convert to degrees
                var averageAngleRadians = Math.atan2(averageSine, averageCosine);
                var averageAngleDegrees = (averageAngleRadians * 180) / Math.PI;
            
                this.token.document.rotation = averageAngleDegrees +90;                
            }
        }
        this.previousPosition = currentPos; // Update the previous position
        this.rotationPosition = coords; // Update the rotation position
    }
    
}
