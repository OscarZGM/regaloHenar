import Phaser from 'phaser';

const TILE_SIZE = 32;
const MOVE_SPEED_INTERPOLATION = 0.2;

export class Player extends Phaser.Physics.Arcade.Sprite {
    public isMoving: boolean = false;
    private targetPosition: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
    private collisionLayer: Phaser.Tilemaps.TilemapLayer;
    private groundLayer: Phaser.Tilemaps.TilemapLayer;
    private facing: string = 'down';

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        collisionLayer: Phaser.Tilemaps.TilemapLayer,
        groundLayer: Phaser.Tilemaps.TilemapLayer
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
        this.groundLayer = groundLayer;

        this.setFrame(0); // Asegura el frame inicial

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

        // Pass 'true' (nonNull) so we get a Tile object even for empty tiles (index -1)
        // IF we are within bounds. If out of bounds, it still returns null.
        const tile = this.collisionLayer.getTileAtWorldXY(nextX, nextY, true);
        const groundTile = this.groundLayer.getTileAtWorldXY(nextX, nextY, true);

        // 🚩 Colisión Estricta:
        // 1. Tile nulo -> Fuera de los límites del mapa -> Bloqueo
        const isOutOfBounds = (tile === null);

        // 2. Tile sólido (propiedad o ID)
        // Nota: tile.index === -1 significa vacío/transparente (walkable en capa colisión)
        const isCollisionTile = tile && (tile.properties.isSolid || tile.index === 1 || tile.index === 2);

        // 3. Agua profunda en capa suelo (ID 5)
        const isWaterTile = groundTile && (groundTile.index === 5);

        if (isOutOfBounds || isCollisionTile || isWaterTile) {
            return false;
        }

        let animationKey = 'walk_down';

        if (direction.x < 0) {
            this.facing = 'left';
            animationKey = 'walk_left';
        }
        else if (direction.x > 0) {
            this.facing = 'right';
            animationKey = 'walk_right';
        }
        else if (direction.y < 0) {
            this.facing = 'up';
            animationKey = 'walk_up';
        }
        else if (direction.y > 0) {
            this.facing = 'down';
            animationKey = 'walk_down';
        }

        this.play(animationKey, true);

        this.targetPosition.set(nextX, nextY);
        this.isMoving = true;

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
        if (!this.isMoving) {
            if (this.anims.isPlaying && this.anims.currentAnim && !this.anims.currentAnim.key.startsWith('idle_')) {
                this.play(`idle_${this.facing}`);
            }
            return;
        }

        this.x = Phaser.Math.Linear(this.x, this.targetPosition.x, MOVE_SPEED_INTERPOLATION);
        this.y = Phaser.Math.Linear(this.y, this.targetPosition.y, MOVE_SPEED_INTERPOLATION);

        if (Phaser.Math.Distance.Between(this.x, this.y, this.targetPosition.x, this.targetPosition.y) < 1) {
            this.setPosition(this.targetPosition.x, this.targetPosition.y);
            this.isMoving = false;
            this.scene.events.emit('playerStopMove');

            this.play(`idle_${this.facing}`);
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
        this.play(`idle_${this.facing}`);
    }
}