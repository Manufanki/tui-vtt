import { moduleName } from "../../tui-vtt.js";
import { tokenMarker, findToken, debug, compatibleCore } from "../Misc/misc.js";

export class TouchToken{
    constructor(id, token = undefined) {
        this.id = id;
        this.controlledToken = undefined;
        this.currentPosition;
        this.token = token;
        this.rawCoordinated;
        this.previousPosition;
        this.rotationPosition;
        this.rotationThreshold;
        this.rotationHistory = [];
        this.rotationAngle = 0;
        this.patternTouchIds = [];

        this.marker = new tokenMarker();
        canvas.stage.addChild(this.marker);
        this.marker.init();
    }

    async update(data, scaledCoords, forceNew =false,e){
        
        if (data.x == undefined || data.y == undefined) return false;
        let coords = {x:data.x,y:data.y}
        this.rawCoordinates = coords;
    
        if (this.token == undefined || forceNew) 
        {
            //Find the nearest token to the scaled coordinates
            if (this.token == undefined) 
            {
                //this.token = findToken( scaledCoords );

            }
            if (this.token == undefined) {
                debug('updateMovement','No token found')
                return false;
            }

            if (this.token.can(game.user,"control") == false && game.settings.get(moduleName,'EnNonOwned') == false) {
                this.token = undefined;
                debug('updateMovement',`User can't control token ${this.token.name}`)
                return false;
            }

            this.rotationThreshold = game.settings.get(moduleName,'rotationThreshold');
            this.currentPosition = {x:this.token.x+canvas.dimensions.size/2, y:this.token.y+canvas.dimensions.size/2}
            this.previousPosition = this.currentPosition;
            this.controlledToken = this.token;
            this.originPosition = {x:this.token.x, y:this.token.y};
        }
        if (this.token.can(game.user,"control"))
            this.token.control({releaseOthers:false});
        
        this.moveToken(scaledCoords);
        if (game.settings.get(moduleName,'movementMarker') && this.marker != undefined && this.token != undefined) this.marker.show();
            return true;
    }

    async moveToken(coords){
        //Compensate for the difference between the center of the token and the top-left of the token, and compensate for token size
        if (compatibleCore('10.0')) {
            coords.x -= this.token.hitArea.width/2;
            coords.y -= this.token.hitArea.height/2;
            if (Math.abs(coords.x-this.token.x) < 5 && Math.abs(coords.y-this.token.y) < 5) return;
        }
        else {
            coords.x -= this.token.hitArea.width/2 +(this.token.data.width - 1)*canvas.dimensions.size/2;
            coords.y -= this.token.hitArea.height/2 -(this.token.data.height - 1)*canvas.dimensions.size/2;
            if (Math.abs(coords.x-this.token.data.x) < 5 && Math.abs(coords.y-this.token.data.y) < 5) return;
        }

        let cp = canvas.grid.getCenter(coords.x+canvas.dimensions.size/2,coords.y+canvas.dimensions.size/2);
        let currentPos = {x:cp[0], y:cp[1]};

        let collision = false;
        if (this.previousPosition == undefined) 
        {
            this.previousPosition = currentPos;
        }
        else if (this.previousPosition.x != currentPos.x || this.previousPosition.y != currentPos.y)
        {
            collision = this.checkCollision(this.token,this.previousPosition,currentPos);       
        }

        if (this.token.can(game.user,"control") == false) {
            collision = false;
        }

        if (collision == false) {
            
            await this.rotateToken(coords,currentPos);
          
                //Check surrounding Grid
            if (this.token.can(game.user,"control")) 
            {
                let surroundingGridCollisions = this.checkSurroundingGridCollision(coords,currentPos);
                let collisions = [surroundingGridCollisions[0],surroundingGridCollisions[1],surroundingGridCollisions[2],surroundingGridCollisions[3]];
                
                if (surroundingGridCollisions[4]) {collisions[0]=true; collisions[2]=true}
                if (surroundingGridCollisions[5]) {collisions[0]=true; collisions[3]=true}
                if (surroundingGridCollisions[6]) {collisions[1]=true; collisions[2]=true}
                if (surroundingGridCollisions[7]) {collisions[1]=true; collisions[3]=true}

                //if (!surroundingGridCollisions[0] && !surroundingGridCollisions[1]) this.token.data.x = coords.x;
                //if (!surroundingGridCollisions[2] && !surroundingGridCollisions[3]) this.token.data.y = coords.y;
                let moveX = false;
                let moveY = false;
                if (!collisions[0] && !collisions[1]) moveX = true;
                if (!collisions[2] && !collisions[3]) moveY = true;
                
                if (moveX && moveY) {

                    this.token.document.x = coords.x;
                    this.token.document.y = coords.y;

                    
                    //this.currentPosition = currentPos;
                }
                //movement in X is allowed, Y is not
                else if (!surroundingGridCollisions[0] && !surroundingGridCollisions[1]) {
                    if (compatibleCore('10.0')) {
                        this.token.document.x = coords.x;
                        this.token.document.y = currentPos.y - Math.floor(canvas.dimensions.size/2);
                    }
                    else {
                        this.token.data.x = coords.x;
                        this.token.data.y = currentPos.y - Math.floor(canvas.dimensions.size/2);
                    }
                }
                //movement in Y is allowed, X is not
                else if (!surroundingGridCollisions[2] && !surroundingGridCollisions[3]) {
                    if (compatibleCore('10.0')) {
                        this.token.document.x = currentPos.x - Math.floor(canvas.dimensions.size/2);
                        this.token.document.y = coords.y;
                    }
                    else {
                        this.token.data.x = currentPos.x - Math.floor(canvas.dimensions.size/2);
                        this.token.data.y = coords.y;
                    } 
                }
                this.currentPosition = currentPos;
            }
            else {
                if (compatibleCore('10.0')) {
                    this.token.document.x = coords.x;
                    this.token.document.y = coords.y;
                }
                else {
                    this.token.data.x = coords.x;
                    this.token.data.y = coords.y;
                }
                this.currentPosition = currentPos;
            }
            this.token.refresh();
            this.token.updateSource({noUpdateFog: false});
            debug('moveToken',`Token: ${this.token.name}, Move to: (${coords.x}, ${coords.y})`)

             //Get the coordinates of the center of the grid closest to the coords
             let newCoords = {
                x: (this.currentPosition.x-canvas.dimensions.size/2),
                y: (this.currentPosition.y-canvas.dimensions.size/2),
                rotation: compatibleCore('10.0') ? this.token.document.rotation : this.token.data.rotation
            }

        }
        else
            debug('moveToken',`Token: ${this.token.name}, Can't move due to a wall collision`)
 
        
        //Draw the movement marker
        if (game.settings.get(moduleName,'movementMarker')) {
            const color = collision ? "0xFF0000" : "0x00FF00"
            if (this.currentPosition != undefined && this.token != undefined)
                this.marker.updateMarker({
                    x: currentPos.x,
                    y: currentPos.y,
                    width: canvas.dimensions.size,
                    height: canvas.dimensions.size,
                    color: color
                })
        }
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
                
                if(this.rotationHistory.length > 5) this.rotationHistory.shift();
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
      /*
     * Check for wall collisions
     */
      checkCollision(token,origin,destination) {
        if (compatibleCore('10.0')) {
            return token.checkCollision(destination, {origin:origin});
        }
        else {
            // Create a Ray for the attempted move
            let ray = new Ray({x: origin.x, y: origin.y}, {x: destination.x, y: destination.y});

            // Shift the origin point by the prior velocity
            ray.A.x -= token._velocity.sx;
            ray.A.y -= token._velocity.sy;

            // Shift the destination point by the requested velocity
            ray.B.x -= Math.sign(ray.dx);
            ray.B.y -= Math.sign(ray.dy);

            // Check for a wall collision
            return canvas.walls.checkCollision(ray);
        }
    }

    /*
     * Check if surrounding grids cause wall collisions
     */
    checkSurroundingGridCollision(coords,origin) {
        
        const offsetFromGrid = {
            x: coords.x+canvas.dimensions.size/2 - origin.x,
            y: coords.y+canvas.dimensions.size/2 - origin.y
        }
        let surroundingGrids = [false,false,false,false,false,false,false,false];
        if (offsetFromGrid.x > 0)       surroundingGrids[0] = this.checkCollision(this.token,origin,{x:origin.x+canvas.dimensions.size,   y:origin.y})
        else if (offsetFromGrid.x < 0)  surroundingGrids[1] = this.checkCollision(this.token,origin,{x:origin.x-canvas.dimensions.size,   y:origin.y})
        if (offsetFromGrid.y > 0)       surroundingGrids[2] = this.checkCollision(this.token,origin,{x:origin.x,                          y:origin.y+canvas.dimensions.size})
        else if (offsetFromGrid.y < 0)  surroundingGrids[3] = this.checkCollision(this.token,origin,{x:origin.x,                          y:origin.y-canvas.dimensions.size})

        if (offsetFromGrid.x > 0 && offsetFromGrid.y > 0)       surroundingGrids[4] = this.checkCollision(this.token,origin,{x:origin.x+canvas.dimensions.size, y:origin.y+canvas.dimensions.size})
        else if (offsetFromGrid.x > 0 && offsetFromGrid.y < 0)  surroundingGrids[5] = this.checkCollision(this.token,origin,{x:origin.x+canvas.dimensions.size, y:origin.y-canvas.dimensions.size})
        else if (offsetFromGrid.x < 0 && offsetFromGrid.y > 0)  surroundingGrids[6] = this.checkCollision(this.token,origin,{x:origin.x-canvas.dimensions.size, y:origin.y+canvas.dimensions.size})
        else if (offsetFromGrid.x < 0 && offsetFromGrid.y < 0)  surroundingGrids[7] = this.checkCollision(this.token,origin,{x:origin.x-canvas.dimensions.size, y:origin.y-canvas.dimensions.size})
        return surroundingGrids;
    }

    /**
     * Find the nearest empty space
     * @param {} coords 
     */
    findNearestEmptySpace(coords) {
        const spacer = (compatibleCore('10.0') ? canvas.scene.gridType : canvas.scene.data.gridType) === CONST.GRID_TYPES.SQUARE ? 1.41 : 1;
        //If space is already occupied
        if (findToken(this.token.getCenter(coords.x,coords.y),(spacer * Math.min(canvas.grid.w, canvas.grid.h))/2,this.token) != undefined) {
            ui.notifications.warn("Material Plane: "+game.i18n.localize("tui-vtt.Notifications.SpaceOccupied"));
            let ray = new Ray({x: this.originPosition.x, y: this.originPosition.y}, {x: coords.x, y: coords.y});

            //Code below modified from _highlightMeasurement() in ruler class in core foundry  
            const nMax = Math.max(Math.floor(ray.distance / (spacer * Math.min(canvas.grid.w, canvas.grid.h))), 1);
            const tMax = Array.fromRange(nMax+1).map(t => t / nMax);

            // Track prior position
            let prior = null;
            let gridPositions = [];
            // Iterate over ray portions
            for ( let [i, t] of tMax.entries() ) {
                let {x, y} = ray.project(t);
             
                // Get grid position
                let [r0, c0] = (i === 0) ? [null, null] : prior;
                let [r1, c1] = canvas.grid.grid.getGridPositionFromPixels(x, y);
                if ( r0 === r1 && c0 === c1 ) continue;
                let [x1, y1] = canvas.grid.grid.getPixelsFromGridPosition(r1, c1);
                gridPositions.push({x: x1, y: y1})
                
                // Skip the first one
                prior = [r1, c1];
                if ( i === 0 ) continue;

                // If the positions are not neighbors, also highlight their halfway point
                if ( !canvas.grid.isNeighbor(r0, c0, r1, c1) ) {
                    let th = tMax[i - 1] + (0.5 / nMax);
                    let {x, y} = ray.project(th);
                    let [rh, ch] = canvas.grid.grid.getGridPositionFromPixels(x, y);
                    let [xh, yh] = canvas.grid.grid.getPixelsFromGridPosition(rh, ch);
                    gridPositions.splice(gridPositions.length-1, 0, {x: xh, y: yh})
                }
            }
            for (let i=gridPositions.length-1; i>=0; i--) {
                const position = gridPositions[i];
                const centeredPosition = this.token.getCenter(position.x,position.y);
                if (this.checkCollision(this.token,this.token.getCenter(coords.x,coords.y),centeredPosition)) {
                    continue;
                }
                if (findToken(centeredPosition,(spacer * Math.min(canvas.grid.w, canvas.grid.h))/2,this.token) == undefined) {
                    coords.x = position.x;
                    coords.y = position.y;
                    return coords;
                }
            }
            return this.originPosition;
        }
        return coords;
    }

     /**
     * Calculate the difference between the old coordinates of the token and the last measured coordinates, and move the token there
     */
    async dropToken(){
        //If no token is controlled, return
        if (this.token == undefined) return false;
        
        //this.moveToken(this.currentPosition)
        let newCoords = {
            x: (this.currentPosition.x-canvas.dimensions.size/2),
            y: (this.currentPosition.y-canvas.dimensions.size/2),
            rotation: compatibleCore('10.0') ? this.token.document.rotation : this.token.data.rotation
        }

        

        if (game.settings.get(moduleName,'collisionPrevention')) {
            newCoords = this.findNearestEmptySpace(newCoords);
        
            if (compatibleCore('10.0')) {
            }
            else {
                this.currentPosition = {
                    x: (newCoords.x+canvas.dimensions.size/2),
                    y: (newCoords.y+canvas.dimensions.size/2),
                    rotation: compatibleCore('10.0') ? this.token.document.rotation : this.token.data.rotation
                }
            }
        }
        
        this.previousPosition = this.currentPosition;
        
        await this.moveToken(this.currentPosition);

        //Release token, if setting is enabled
        this.token.release();
        this.token = undefined;
        this.marker.hide();
        return true;
    }

    requestMovement(token,coords){
        let payload = {
            "msgType": "moveToken",
            "senderId": game.user.id, 
            "receiverId": game.data.users.find(users => users.role == 4)._id, 
            "tokenId": token.id,
            "newCoords": coords
        };
        game.socket.emit(`module.${moduleName}`, payload);
    }
}