// src/classes/Player.ts

import Phaser from 'phaser';

const TILE_SIZE = 32;
const MOVE_SPEED_INTERPOLATION = 0.2;

export class Player extends Phaser.Physics.Arcade.Sprite {
    public isMoving: boolean = false;
    private targetPosition: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
    private collisionLayer: Phaser.Tilemaps.TilemapLayer;
    private facing: string = 'down';

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        collisionLayer: Phaser.Tilemaps.TilemapLayer
    ) {
        const startX = Math.floor(x / TILE_SIZE) * TILE_SIZE;
        const startY = Math.floor(y / TILE_SIZE) * TILE_SIZE;
        super(scene, startX, startY, texture);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setOrigin(0, 0);
        this.setDepth(10);
        this.targetPosition.set(this.x, this.y);
        
        this.collisionLayer = collisionLayer;
        
        // Animación idle simple
        this.scene.tweens.add({
            targets: this,
            scaleY: 0.95,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    public tryMove(direction: Phaser.Math.Vector2): boolean {
        if (this.isMoving) return false;

        const nextX = this.x + direction.x * TILE_SIZE;
        const nextY = this.y + direction.y * TILE_SIZE;

        // Verificar límites del mapa
        const tile = this.collisionLayer.getTileAtWorldXY(nextX, nextY);

        if (tile && tile.properties.isSolid) {
            // Efecto de choque
            this.scene.tweens.add({
                targets: this,
                x: this.x + direction.x * 5,
                y: this.y + direction.y * 5,
                duration: 100,
                yoyo: true,
                ease: 'Power2'
            });
            return false;
        }

        // Actualizar dirección
        if (direction.x < 0) this.facing = 'left';
        else if (direction.x > 0) this.facing = 'right';
        else if (direction.y < 0) this.facing = 'up';
        else if (direction.y > 0) this.facing = 'down';

        this.targetPosition.set(nextX, nextY);
        this.isMoving = true;
        
        // Animación de movimiento suave
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.05,
            scaleY: 0.95,
            duration: 150,
            yoyo: true
        });
        
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

    public getFacing(): string {
        return this.facing;
    }

    public teleportTo(x: number, y: number) {
        const gridX = Math.floor(x / TILE_SIZE) * TILE_SIZE;
        const gridY = Math.floor(y / TILE_SIZE) * TILE_SIZE;
        this.setPosition(gridX, gridY);
        this.targetPosition.set(gridX, gridY);
        this.isMoving = false;
    }
}