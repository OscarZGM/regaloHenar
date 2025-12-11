// src/classes/Player.ts

import Phaser from 'phaser';

const TILE_SIZE = 32;
const MOVE_SPEED_INTERPOLATION = 0.15;

export class Player extends Phaser.Physics.Arcade.Sprite {
    public isMoving: boolean = false;
    private targetPosition: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
    private collisionLayer: Phaser.Tilemaps.TilemapLayer;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, collisionLayer: Phaser.Tilemaps.TilemapLayer) {
        
        const startX = Math.floor(x / TILE_SIZE) * TILE_SIZE;
        const startY = Math.floor(y / TILE_SIZE) * TILE_SIZE;
        super(scene, startX, startY, texture);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setOrigin(0, 0); 
        this.targetPosition.set(this.x, this.y);
        
        this.collisionLayer = collisionLayer; 
    }

    public tryMove(direction: Phaser.Math.Vector2): boolean {
        if (this.isMoving) return false;

        let nextX = this.x + direction.x * TILE_SIZE;
        let nextY = this.y + direction.y * TILE_SIZE;

        const tile = this.collisionLayer.getTileAtWorldXY(nextX, nextY);

        if (tile && tile.properties.isSolid) {
             return false;
        }

        this.targetPosition.set(nextX, nextY);
        this.isMoving = true;
        return true;
    }

    public updateMovement() {
        if (!this.isMoving) return;

        this.x = Phaser.Math.Linear(this.x, this.targetPosition.x, MOVE_SPEED_INTERPOLATION);
        this.y = Phaser.Math.Linear(this.y, this.targetPosition.y, MOVE_SPEED_INTERPOLATION);

        if (Phaser.Math.Distance.Between(this.x, this.y, this.targetPosition.x, this.targetPosition.y) < 1) {
            this.setPosition(this.targetPosition.x, this.targetPosition.y);
            this.isMoving = false;
            this.scene.events.emit('playerStopMove'); 
        }
    }
}