import { tokenMarker } from "../Misc/misc.js";

export class PatternTamplate{
    constructor(touchPoints, id){
        if (touchPoints.length !== 3) {
            throw new Error("Triangle must be initialized with exactly 3 touch points.");
        }
        this.sortedVertices = sortPointsCounterclockwise(touchPoints);
        
        const sideLengths = [
            Math.sqrt(Math.pow(this.sortedVertices[1][0] - this.sortedVertices[0][0], 2) + Math.pow(this.sortedVertices[1][1] - this.sortedVertices[0][1], 2)),
            Math.sqrt(Math.pow(this.sortedVertices[2][0] - this.sortedVertices[1][0], 2) + Math.pow(this.sortedVertices[2][1] - this.sortedVertices[1][1], 2)),
            Math.sqrt(Math.pow(this.sortedVertices[0][0] - this.sortedVertices[2][0], 2) + Math.pow(this.sortedVertices[0][1] - this.sortedVertices[2][1], 2))
        ];
        
        this.featureVectors = [
            sideLengths,
            [sideLengths[1], sideLengths[2], sideLengths[0]],
            [sideLengths[2], sideLengths[0], sideLengths[1]]
        ];
        this.id = id;
        this.rotationAngle = 0;

        this.marker1 = new tokenMarker();
        this.marker2 = new tokenMarker();
        this.marker3 = new tokenMarker();
        canvas.stage.addChild(this.marker1);
        canvas.stage.addChild(this.marker2);
        canvas.stage.addChild(this.marker3);
        this.marker1.init();
        this.marker2.init();
        this.marker3.init();

    }

    debug(){
        console.log("TUI_Feature Vector:", this.featureVector);
        console.log("TUI_Sorted Vertices:", this.sortedVertices);
        const color1 =  "0xFF0000";
        const color2 =  "0x00FF00";
        const color3 =  "0x0000FF";

        this.marker1.show()
        this.marker2.show()
        this.marker3.show()
        this.marker1.updateMarker({
            x: this.sortedVertices[0].x,
            y: this.sortedVertices[0].y,
            width: canvas.dimensions.size,
            height: canvas.dimensions.size,
            color: color1
        })
        this.marker2.updateMarker({
            x: this.sortedVertices[1].x,
            y: this.sortedVertices[1].y,
            width: canvas.dimensions.size,
            height: canvas.dimensions.size,
            color: color2
        })
        this.marker3.updateMarker({
            x: this.sortedVertices[2].x,
            y: this.sortedVertices[2].y,
            width: canvas.dimensions.size,
            height: canvas.dimensions.size,
            color: color3
        })
        
    }
}

function sortPointsCounterclockwise(points) {
    // Calculate centroid of the triangle
    const centroid = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
    centroid[0] /= points.length;
    centroid[1] /= points.length;
    
    // Sort points counterclockwise based on their angle relative to the centroid
    points.sort((a, b) => {
        const angleA = Math.atan2(a[1] - centroid[1], a[0] - centroid[0]);
        const angleB = Math.atan2(b[1] - centroid[1], b[0] - centroid[0]);
        return angleA - angleB;
    });

    return points;
}

function recognizeTriangle(touchPoints, patternTemplates) {
    let sortedVertices = touchPoints.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
    // Calculate distance between f and each template
    let minDistance = Infinity;
    let minTemplateId = null;
    patternTemplates.forEach((template) => {
        const distance = Math.sqrt(template.reduce((acc, val, idx) => acc + Math.pow(val - featureVector[idx], 2), 0));
        if (distance < minDistance) {
            minDistance = distance;
            minTemplateId = template.id;
        }
    });

    // Obtain rotation angle of the triangular pattern
    const xAxixVector = [patternTemplates[minTemplateId][0], patternTemplates[minTemplateId][1]];
    const origin = [sortedVertices.reduce((acc, val) => acc + val[0], 0) / 3, sortedVertices.reduce((acc, val) => acc + val[1], 0) / 3];
    const xAxixAngle = Math.atan2(xAxixVector[1] - origin[1], xAxixVector[0] - origin[0]);
    const rotationAngle = (xAxixAngle * 180) / Math.PI;

    return [minTemplateId, rotationAngle];
}