import { createVector, calculateDistance, findCentroid } from "../Misc/misc.js";

export class PatternTamplate{
    constructor(touchPoints, id){
        if (touchPoints.length !== 3) {
            throw new Error("Triangle must be initialized with exactly 3 touch points.");
        }
        this.center = findCentroid(touchPoints);

        this.angles = touchPoints.map((point, index) => {
            return {
                index: index,
                angle: Math.atan2(point[1] - this.center[1], point[0] - this.center[0])
            };
        });

        // Sort the points by angle in counterclockwise order
        this.angles.sort((a, b) => a.angle - b.angle);

        // Create the sortedPoints array and the index mapping
        this.sortedVertices = this.angles.map(a => touchPoints[a.index]);
        this.indexMapping  = this.angles.map(a => a.index);        
        
        this.sideLengths = [
            calculateDistance(this.sortedVertices[0], this.sortedVertices[1]),
            calculateDistance(this.sortedVertices[1], this.sortedVertices[2]),
            calculateDistance(this.sortedVertices[2], this.sortedVertices[0])
        ];
        this.sideLengthsRounded = [
            Math.round(this.sideLengths[0]),
            Math.round(this.sideLengths[1]),
            Math.round(this.sideLengths[2]) 
        ];
            
        this.featureVectors = [
            this.sideLengths,
            [this.sideLengths[1], this.sideLengths[2], this.sideLengths[0]],
            [this.sideLengths[2], this.sideLengths[0], this.sideLengths[1]]
        ];
        this.id = id;
        this.centerVector = [createVector(this.center, this.sortedVertices[0]),
                            createVector(this.center, this.sortedVertices[1]),
                            createVector(this.center, this.sortedVertices[2])];

        this.verticesAngles = [angleBetweenVectorAndScreen(this.sortedVertices[0]), 
                            angleBetweenVectorAndScreen(this.sortedVertices[1]), 
                            angleBetweenVectorAndScreen(this.sortedVertices[2])];

        this.sideVectors = [createVector(this.sortedVertices[0], this.sortedVertices[1]), 
                            createVector(this.sortedVertices[1], this.sortedVertices[2]), 
                            createVector(this.sortedVertices[2], this.sortedVertices[1],)];

        this.centerAngles = [angleBetweenVectors(this.centerVector[0], this.sideVectors[0]),
                            angleBetweenVectors(this.centerVector[1], this.sideVectors[1]),
                            angleBetweenVectors(this.centerVector[2], this.sideVectors[2])];
            

        this.detectionThreshold = 50;
    }

    debug(){
        console.log("TUI_Feature Vector:", this.featureVectors);
    }

}


export function recognizePattern(featureVector, featureVectors) {
    var d0 = euclideanNorm(featureVector.map((value, index) => value - featureVectors[0][index]));
    var d1 = euclideanNorm(featureVector.map((value, index) => value - featureVectors[1][index]));
    var d2 = euclideanNorm(featureVector.map((value, index) => value - featureVectors[2][index]));


    if(d0 < d1 && d0 < d2) 
    {
        return [d0,2];
    }
    if(d1 < d0 && d1 < d2)
    {
        return [d1,1];
    }
    if(d2 < d1 && d2 < d0)
    {
        return [d2,0];
    }
    
    return[1000,0]

}

function euclideanNorm(vector) {
    let sumOfSquares = vector.reduce((accumulator, currentValue) => accumulator + Math.pow(currentValue, 2), 0);
    return Math.sqrt(sumOfSquares);
}

function angleBetweenVectorAndScreen(v) {
    var radians = Math.atan2(v.y, v.x);
    return radians;
}
function angleBetweenVectors(v1,v2) {
    
    // Calculate dot product
    var dotProduct = v1.x * v2.x + v1.y * v2.y;

    // Calculate magnitudes
    var uMagnitude = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    var vMagnitude = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    // Calculate cosine of the angle
    var cosineTheta = dotProduct / (uMagnitude * vMagnitude);

    // Ensure the value is within the valid range for Math.acos
    cosineTheta = Math.max(-1, Math.min(1, cosineTheta));

    // Calculate the angle in radians
    var angleRadians = Math.acos(cosineTheta);

    return angleRadians;
}
export function calculateRotation(originalTemplate, rotatedTemplate, templateId){
    var rotatedPoint = rotatedTemplate.sortedVertices[templateId];

    var forwardVector = {x: rotatedTemplate.center.x - rotatedPoint.x, y: rotatedTemplate.center.y - rotatedPoint.y};
    
    var radians = originalTemplate.centerAngles[0] + angleBetweenVectorAndScreen(forwardVector);
    var degrees = radians * (180 / Math.PI);

    return degrees;
}