import { tokenMarker } from "../Misc/misc.js";

export class PatternTamplate{
    constructor(touchPoints, id){
        if (touchPoints.length !== 3) {
            throw new Error("Triangle must be initialized with exactly 3 touch points.");
        }
        this.sortedVertices = sortVertices(touchPoints);
        this.center = findCentroid(this.sortedVertices);
        
        this.sideLengths = [
            calculateDistance(this.sortedVertices[0], this.sortedVertices[1]),
            calculateDistance(this.sortedVertices[1], this.sortedVertices[2]),
            calculateDistance(this.sortedVertices[2], this.sortedVertices[0])
        ];
            
        this.featureVectors = [
            this.sideLengths,
            [this.sideLengths[1], this.sideLengths[2], this.sideLengths[0]],
            [this.sideLengths[2], this.sideLengths[0], this.sideLengths[1]]
        ];
        this.id = id;
        this.forwardPointSideLength =[this.sideLengths[0],this.sideLengths[1]];    
        this.forwardVector = {x: this.center.x - this.sortedVertices[0].x, y: this.center.y - this.sortedVertices[0].y};
        this.rotationAngle = angleBetweenVectors(this.forwardVector.x,this.forwardVector.y)

        this.detectionThreshold = 50;
    }

    debug(){
        console.log("TUI_Feature Vector:", this.featureVectors);
    }

    showMarkers() {
        const color1 = 0xFF0000;
        const color2 = 0x00FF00;
        const color3 = 0x0000FF;

        this.marker1.show();
        this.marker2.show();
        this.marker3.show();

        // Convert vertex coordinates to screen space
        const vertex1 = this.sortedVertices[0];
        const vertex2 = this.sortedVertices[1];
        const vertex3 = this.sortedVertices[2];

        // Update marker positions
        this.marker1.updateMarker({
            x: vertex1.x,
            y: vertex1.y,
            width: canvas.dimensions.size,
            height: canvas.dimensions.size,
            color: color1
        });
        this.marker2.updateMarker({
            x: vertex2.x,
            y: vertex2.y,
            width: canvas.dimensions.size,
            height: canvas.dimensions.size,
            color: color2
        });
        this.marker3.updateMarker({
            x: vertex3.x,
            y: vertex3.y,
            width: canvas.dimensions.size,
            height: canvas.dimensions.size,
            color: color3
        });
    }

    hideMarkers() {
        // Hide markers
        this.marker1.hide();
        this.marker2.hide();
        this.marker3.hide();

        
    }
    hideLines() {
        // Remove lines
        this.lines.forEach(line => canvas.stage.removeChild(line)); // Remove each line from canvas
        this.lines = []; // Clear the lines array
    }

    drawLine(point1, point2) {
        // Draw line between two points
        const line = new PIXI.Graphics();
        line.lineStyle(2, 0xFFFFFF, 1); // White color, thickness 2
        line.moveTo(point1[0], point1[1]);
        line.lineTo(point2[0], point2[1]);
        canvas.stage.addChild(line);
        this.lines.push(line); // Store reference to the line
    }

    getPointByTwoSides(side1, side2 ) {

        if(closestSideLength(side1,this.sideLengths, 0) &&closestSideLength(side2,this.sideLengths, 1)) {
            return this.sortedVertices[1];
        }
        if(closestSideLength(side1,this.sideLengths, 1) &&closestSideLength(side2,this.sideLengths, 2)) {
            return this.sortedVertices[2];
        }
        if(closestSideLength(side1,this.sideLengths, 2) &&closestSideLength(side2,this.sideLengths, 0)) {
            return this.sortedVertices[0];
        }
        return this.sortedVertices[0];
        
    }
}

function closestSideLength(side, sideLengths, index) {

    var distance = 100000;
    var closestIndex = -1;
    for (let i = 0; i < sideLengths.length; i++) {
        var tempDistance = Math.abs(side - sideLengths[i])
        if(tempDistance < distance) 
        {
            distance = tempDistance;
            closestIndex = i;
        }

    }

    if(index == closestIndex)
    {
        return true;
    }
    else {
        return false;
    }
}


function calculateDistance(point1, point2) {
    const deltaX = point2.x - point1.x;
    const deltaY = point2.y - point1.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    return distance;
}

function findCentroid(points) {
    let x = 0;
    let y = 0;
    for (let p of points) {
        x += p.x;
        y += p.y;
    }
    const center = { x: 0, y: 0 };
    center.x = x / points.length;
    center.y = y / points.length;
    return center;
}

function sortVertices(points) {
    // Get centroid
    const center = findCentroid(points);
    points.sort((a, b) => {
        const a1 = (Math.atan2(a.x - center.x, a.y - center.y) * 180 / Math.PI + 360) % 360;
        const a2 = (Math.atan2(b.x - center.x, b.y - center.y) * 180 / Math.PI + 360) % 360;
        return a1 - a2;
    });
    return points;
}

export function recognizeTriangle(featureVector, featureVectors) {
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

function angleBetweenVectors(x, y) {
    var radians = Math.atan2(y, x);
    var degrees = radians * (180 / Math.PI);
    return degrees;
}

export function calculateRotation(originalTemplate, rotatedTemplate, templateId){
    var rotatedPoint = rotatedTemplate.sortedVertices[templateId];

    var forwardVector = {x: rotatedTemplate.center.x - rotatedPoint.x, y: rotatedTemplate.center.y - rotatedPoint.y};
    
    var angle = originalTemplate.rotationAngle + angleBetweenVectors(forwardVector.x, forwardVector.y);
    return angle;
}