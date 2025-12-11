// src/scenes/GameScene.ts

import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { GameManager } from '../classes/GameManager';
import { DialogBox } from '../classes/DialogBox';

const TILE_SIZE = 32;

interface MapConfig {
    key: string;
    tilemap: string;
    spawn: { x: number, y: number };
    exits: Array<{
        x: number, y: number,
        targetMap: string,
        targetSpawn: { x: number, y: number }
    }>;
}

export class GameScene extends Phaser.Scene {
    private player!: Player;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private gm: GameManager = GameManager.getInstance();
    private map!: Phaser.Tilemaps.Tilemap;
    private collisionLayer!: Phaser.Tilemaps.TilemapLayer;
    private currentMapKey: string = 'house';
    private dialogBox!: DialogBox;
    private uiText!: Phaser.GameObjects.Text;
    
    private mapConfigs: { [key: string]: MapConfig } = {
        house: {
            key: 'house',
            tilemap: 'house_map',
            spawn: { x: 12, y: 8 },
            exits: [
                { x: 12, y: 17, targetMap: 'valencia', targetSpawn: { x: 10, y: 2 } }
            ]
        },
        valencia: {
            key: 'valencia',
            tilemap: 'valencia_map',
            spawn: { x: 10, y: 13 },
            exits: [
                { x: 10, y: 14, targetMap: 'house', targetSpawn: { x: 12, y: 16 } }
            ]
        },
        valladolid: {
            key: 'valladolid',
            tilemap: 'valladolid_map',
            spawn: { x: 10, y: 13 },
            exits: [
                { x: 10, y: 14, targetMap: 'house', targetSpawn: { x: 12, y: 16 } }
            ]
        },
        japon: {
            key: 'japon',
            tilemap: 'japon_map',
            spawn: { x: 10, y: 13 },
            exits: [
                { x: 10, y: 14, targetMap: 'house', targetSpawn: { x: 12, y: 16 } }
            ]
        }
    };

    constructor() {
        super('GameScene');
    }

    init(data: { mapKey?: string, spawnX?: number, spawnY?: number }) {
        if (data.mapKey) {
            this.currentMapKey = data.mapKey;
        }
    }

    preload() {
        // Cargar recursos
        this.load.image('tiles', 'assets/images/tileset.png');
        this.load.image('player_placeholder', 'assets/images/player.png');
        this.load.image('package_placeholder', 'assets/images/package.png');
        this.load.image('note_placeholder', 'assets/images/note.png');
        this.load.image('enemy_placeholder', 'assets/images/enemy.png');
        this.load.image('npc_placeholder', 'assets/images/npc.png');
        
        // Cargar todos los mapas
        this.load.tilemapTiledJSON('house_map', 'assets/maps/house_map.json');
        this.load.tilemapTiledJSON('valencia_map', 'assets/maps/valencia_map.json');
        this.load.tilemapTiledJSON('valladolid_map', 'assets/maps/valladolid_map.json');
        this.load.tilemapTiledJSON('japon_map', 'assets/maps/japon_map.json');
    }

    create() {
        this.loadMap(this.currentMapKey);
        this.createUI();
        this.createPlayer();
        this.setupControls();
        this.createInteractables();
        
        this.dialogBox = new DialogBox(this);
        
        this.events.on('playerStopMove', this.onPlayerStopMove, this);
    }

    private loadMap(mapKey: string) {
        // Limpiar mapa anterior si existe
        if (this.map) {
            this.map.destroy();
        }

        const config = this.mapConfigs[mapKey];
        this.map = this.make.tilemap({ key: config.tilemap });
        const tileset = this.map.addTilesetImage('RPG Nature Tileset', 'tiles')!;

        // Crear capas
        const groundLayer = this.map.createLayer('Ground', tileset, 0, 0)!;
        this.collisionLayer = this.map.createLayer('Collision', tileset, 0, 0)!;
        
        // Configurar colisiones
        this.collisionLayer.setCollisionByProperty({ isSolid: true });
        this.collisionLayer.setVisible(false);
        
        // Ajustar cámara
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    }

    private createPlayer() {
        const config = this.mapConfigs[this.currentMapKey];
        const spawnX = config.spawn.x * TILE_SIZE;
        const spawnY = config.spawn.y * TILE_SIZE;
        
        if (this.player) {
            this.player.destroy();
        }
        
        this.player = new Player(this, spawnX, spawnY, 'player_placeholder', this.collisionLayer);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }

    private setupControls() {
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Tecla de interacción
        this.input.keyboard?.on('keydown-SPACE', () => {
            this.handleInteraction();
        });
    }

    private createUI() {
        this.uiText = this.add.text(16, 16, this.gm.getStatus(), {
            fontSize: '18px',
            color: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(100);
    }

    private createInteractables() {
        // Solo crear objetos específicos del mapa casa
        if (this.currentMapKey === 'house') {
            this.createHouseInteractables();
        } else if (this.currentMapKey === 'valencia') {
            this.createValenciaInteractables();
        }
    }

    private createHouseInteractables() {
        // Paquete
        const pkg = this.add.sprite(15 * TILE_SIZE, 5 * TILE_SIZE, 'package_placeholder')
            .setOrigin(0, 0)
            .setInteractive()
            .setData('type', 'package');
        
        // Nota
        const note = this.add.sprite(16 * TILE_SIZE, 5 * TILE_SIZE, 'note_placeholder')
            .setOrigin(0, 0)
            .setInteractive()
            .setData('type', 'note');

        // NPCs
        this.createNPC(10 * TILE_SIZE, 8 * TILE_SIZE, 'Hola! Bienvenida a tu cumpleaños especial. Este lugar está lleno de recuerdos de nosotros.');
        this.createNPC(5 * TILE_SIZE, 12 * TILE_SIZE, 'He escuchado que hay tres lugares importantes que debes visitar para desbloquear tu regalo...');
    }

    private createValenciaInteractables() {
        this.createNPC(10 * TILE_SIZE, 7 * TILE_SIZE, 
            'Valencia... donde comenzó todo. El primer dígito te espera al resolver el puzzle de cajas.'
        );
    }

    private createNPC(x: number, y: number, dialog: string) {
        const npc = this.add.sprite(x, y, 'npc_placeholder')
            .setOrigin(0, 0)
            .setInteractive()
            .setData('type', 'npc')
            .setData('dialog', dialog);
    }

    update() {
        if (this.player) {
            this.player.updateMovement();

            if (!this.player.isMoving && !this.dialogBox.isVisible()) {
                this.handleInput();
            }
        }
        
        this.uiText.setText(`${this.gm.getStatus()} | Mapa: ${this.currentMapKey}`);
    }

    private handleInput() {
        let direction = new Phaser.Math.Vector2(0, 0);

        if (this.cursors.up?.isDown) direction.y = -1;
        else if (this.cursors.down?.isDown) direction.y = 1;
        else if (this.cursors.left?.isDown) direction.x = -1;
        else if (this.cursors.right?.isDown) direction.x = 1;

        if (direction.x !== 0) direction.y = 0;

        if (direction.length() > 0) {
            this.player.tryMove(direction);
        }
    }

    private onPlayerStopMove() {
        this.checkMapTransition();
        this.checkRandomEncounter();
    }

    private checkMapTransition() {
        const config = this.mapConfigs[this.currentMapKey];
        const playerTileX = Math.floor(this.player.x / TILE_SIZE);
        const playerTileY = Math.floor(this.player.y / TILE_SIZE);

        for (const exit of config.exits) {
            if (playerTileX === exit.x && playerTileY === exit.y) {
                this.transitionToMap(exit.targetMap, exit.targetSpawn);
                return;
            }
        }

        // Verificar si está cerca de un punto de viaje
        this.checkTravelPoints(playerTileX, playerTileY);
    }

    private checkTravelPoints(tileX: number, tileY: number) {
        if (this.currentMapKey !== 'house') return;

        const travelPoints = [
            { x: 3, y: 10, map: 'valencia', spawn: { x: 10, y: 13 } },
            { x: 18, y: 2, map: 'valladolid', spawn: { x: 10, y: 13 } },
            { x: 22, y: 12, map: 'japon', spawn: { x: 10, y: 13 } }
        ];

        for (const point of travelPoints) {
            const dist = Phaser.Math.Distance.Between(tileX, tileY, point.x, point.y);
            if (dist < 2) {
                this.showTravelPrompt(point.map, point.spawn);
                return;
            }
        }
    }

    private showTravelPrompt(targetMap: string, spawn: { x: number, y: number }) {
        const message = `¿Viajar a ${targetMap}? (Presiona ENTER para confirmar)`;
        this.dialogBox.show(message, () => {
            this.transitionToMap(targetMap, spawn);
        });
    }

    private transitionToMap(mapKey: string, spawn: { x: number, y: number }) {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.restart({ mapKey: mapKey });
        });
    }

    private handleInteraction() {
        if (this.dialogBox.isVisible()) return;

        // Buscar objeto interactuable cerca del jugador
        const nearbyObjects = this.children.list.filter(obj => {
            if (!(obj instanceof Phaser.GameObjects.Sprite)) return false;
            if (!obj.getData('type')) return false;
            
            const dist = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                obj.x, obj.y
            );
            return dist < TILE_SIZE * 1.5;
        });

        if (nearbyObjects.length > 0) {
            const obj = nearbyObjects[0] as Phaser.GameObjects.Sprite;
            this.interactWithObject(obj);
        }
    }

    private interactWithObject(obj: Phaser.GameObjects.Sprite) {
        const type = obj.getData('type');
        
        switch(type) {
            case 'package':
                this.handlePackageInteraction();
                break;
            case 'note':
                this.showClueNote();
                break;
            case 'npc':
                const dialog = obj.getData('dialog');
                this.dialogBox.show(dialog);
                break;
        }
    }

    private handlePackageInteraction() {
        if (this.gm.checkCode()) {
            this.dialogBox.show(
                `¡CÓDIGO CORRECTO: ${this.gm.correctCode}! ¡FELIZ CUMPLEAÑOS 22! Has completado el juego. ¡Espero que hayas disfrutado este viaje por nuestros recuerdos!`,
                () => {
                    this.cameras.main.fadeOut(2000);
                    this.time.delayedCall(2000, () => {
                        this.scene.start('VictoryScene');
                    });
                }
            );
        } else {
            this.dialogBox.show(`El paquete está bloqueado. ${this.gm.getStatus()} Necesitas encontrar los 3 dígitos en orden: Valencia (2), Valladolid (0), Japón (6).`);
        }
    }

    private showClueNote() {
        this.dialogBox.show(
            "📝 Pista Principal:\n\n" +
            "¡Feliz 22! Tu regalo especial te espera, pero primero debes recordar...\n\n" +
            "🌴 El primer dígito (2) te espera en Valencia al Sur - donde comenzó nuestra historia.\n" +
            "🏛️ El segundo (0) está en Valladolid al Norte - nuestro hogar actual.\n" +
            "🗾 El tercero (6) en Japón al Este - nuestro viaje inolvidable.\n\n" +
            "Encuentra los tres dígitos EN ORDEN para abrir el paquete."
        );
    }

    private checkRandomEncounter() {
        if (this.currentMapKey === 'house') return;
        
        if (Math.random() < 0.02) {
            this.cameras.main.flash(500, 255, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.pause();
                this.scene.launch('BattleScene', { 
                    returnScene: 'GameScene',
                    returnData: { mapKey: this.currentMapKey }
                });
            });
        }
    }
}