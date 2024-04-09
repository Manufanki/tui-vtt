export class Triangle {
    constructor(touchPoints, canvasId) {
        if (touchPoints.length !== 3) {
            throw new Error("Triangle must be initialized with exactly 3 touch points.");
        }
        this.touchPoints = touchPoints;
        this.canvas = document.getElementById(canvasId);;
        this.threshold = 10; // Threshold for difference between sides
    }
    debugInfo() {
        const [pointA, pointB, pointC] = this.touchPoints;
        const [sideAB, sideBC, sideCA] = this.calculateLengths();
        const angleA = this.calculateAngle(sideBC, sideCA, sideAB);
        const angleB = this.calculateAngle(sideCA, sideAB, sideBC);
        const angleC = this.calculateAngle(sideAB, sideBC, sideCA);
    
        console.log("__Tri: Is Isosceles:", this.isIsosceles());
        if (this.isIsosceles()) {
            console.log("__Tri: Isosceles Triangle", this.getEqualAnglesAverage());
        }

    }
    calculateCenterPoint() {
        const sumX = this.touchPoints.reduce((acc, point) => acc + point.x, 0);
        const sumY = this.touchPoints.reduce((acc, point) => acc + point.y, 0);
        const centerX = sumX / 3;
        const centerY = sumY / 3;
        return { x: centerX, y: centerY };
    }
    
    calculateLengths() {
        const [pointA, pointB, pointC] = this.touchPoints;
    
        const sideAB = this.calculateDistance(pointA, pointB);
        const sideBC = this.calculateDistance(pointB, pointC);
        const sideCA = this.calculateDistance(pointC, pointA);
    
        return [sideAB, sideBC, sideCA];
    }
    
    isIsosceles() {
        const [sideAB, sideBC, sideCA] = this.calculateLengths();
    
        if (Math.abs(sideAB - sideBC) <= this.threshold ||
            Math.abs(sideBC - sideCA) <= this.threshold ||
            Math.abs(sideCA - sideAB) <= this.threshold) {
            return true;
        } else {
            return false;
        }
    }
    
    getPointWithDifferentAngle() {
        const [sideAB, sideBC, sideCA] = this.calculateLengths();
    
        if (Math.abs(sideAB - sideBC) <= this.threshold) {
            return this.touchPoints[2]; // Point C has a different angle
        } else if (Math.abs(sideBC - sideCA) <= this.threshold) {
            return this.touchPoints[0]; // Point A has a different angle
        } else {
            return this.touchPoints[1]; // Point B has a different angle
        }
    }
    
    calculateDistance(point1, point2) {
        const deltaX = point2.x - point1.x;
        const deltaY = point2.y - point1.y;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }
    
    calculateAngles() {
        const [pointA, pointB, pointC] = this.touchPoints;
    
        const sideAB = this.calculateDistance(pointA, pointB);
        const sideBC = this.calculateDistance(pointB, pointC);
        const sideCA = this.calculateDistance(pointC, pointA);
    
        const angleA = this.calculateAngle(sideBC, sideCA, sideAB);
        const angleB = this.calculateAngle(sideCA, sideAB, sideBC);
        const angleC = this.calculateAngle(sideAB, sideBC, sideCA);
    
        return [angleA, angleB, angleC];
    }
    calculateAngle(oppositeSide1, oppositeSide2, adjacentSide) {
        // Use the law of cosines to calculate the angle
        const cosAngle = (oppositeSide1 ** 2 + oppositeSide2 ** 2 - adjacentSide ** 2) / (2 * oppositeSide1 * oppositeSide2);
        // Convert the cosine value to radians and then to degrees
        const angleInRadians = Math.acos(cosAngle);
        const angleInDegrees = (angleInRadians * 180) / Math.PI;
        return angleInDegrees;
    }

    getEqualAnglesAverage() {
        const [sideAB, sideBC, sideCA] = this.calculateLengths();
        const angleA = this.calculateAngle(sideBC, sideCA, sideAB);
        const angleB = this.calculateAngle(sideCA, sideAB, sideBC);
        const angleC = this.calculateAngle(sideAB, sideBC, sideCA);

        // Check if the triangle is isosceles based on the threshold
        if (Math.abs(sideAB - sideBC) <= this.threshold) {
            return (angleA + angleB) / 2; // Average of the two almost equal angles
        } else if (Math.abs(sideBC - sideCA) <= this.threshold) {
            return (angleB + angleC) / 2; // Average of the two almost equal angles
        } else if (Math.abs(sideCA - sideAB) <= this.threshold) {
            return (angleA + angleC) / 2; // Average of the two almost equal angles
        } else {
            return null; // Triangle is not isosceles within the threshold
        }
    }

}

