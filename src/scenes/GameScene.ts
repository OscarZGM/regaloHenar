// src/scenes/GameScene.ts

import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { GameManager } from '../classes/GameManager';

const TILE_SIZE = 32;

export class GameScene extends Phaser.Scene {
    private player!: Player;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private gm: GameManager = GameManager.getInstance();
    private map!: Phaser.Tilemaps.Tilemap;

    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('tiles', 'assets/images/tileset.png');
        this.load.image('player_placeholder', 'assets/images/player.png');
        this.load.image('package_placeholder', 'assets/images/package.png');
        this.load.image('note_placeholder', 'assets/images/note.png');
        this.load.image('enemy_placeholder', 'assets/images/enemy.png');
        this.load.tilemapTiledJSON('house_map', 'assets/maps/house_map.json');
    }

    create() {
        // 1. Cargar el mapa
        this.map = this.make.tilemap({ key: 'house_map' });

        // --- CORRECCIÓN 1: EL NOMBRE EXACTO DEL JSON ---
        // En tu JSON pone "name": "RPG Nature Tileset", así que ponemos eso aquí.
        const tileset = this.map.addTilesetImage('RPG Nature Tileset', 'tiles')!;

        // 2. Crear las capas
        // Creamos la capa 'Ground' que SÍ existe en tu JSON
        const groundLayer = this.map.createLayer('Ground', tileset, 0, 0)!;

        // --- CORRECCIÓN 2: EVITAR ERROR DE CAPA FALTANTE ---
        // Como tu JSON dummy NO tiene capa "Collision", desactivamos esto por ahora
        // para que el juego no se rompa. Cuando tengas el mapa final, descomenta esto.
        
        // const collisionLayer = this.map.createLayer('Collision', tileset, 0, 0)!;
        // collisionLayer.setCollisionByProperty({ isSolid: true });
        // this.showDebugWalls(collisionLayer);

        // Si no hay collisionLayer, pasamos 'null' o 'undefined' al jugador temporalmente
        // o creamos una capa vacía para que no falle.
        // Para que funcione YA, pasaremos groundLayer como colisión (aunque no bloqueará nada todavía)
        
        // 3. Crear Jugador
        // Pasamos groundLayer solo para que el código no falle por falta de argumentos
        this.player = new Player(this, TILE_SIZE * 5, TILE_SIZE * 5, 'player_placeholder', groundLayer);
        this.cursors = this.input.keyboard!.createCursorKeys();

        // 4. Objetos interactivos
        const package_sprite = this.add.image(TILE_SIZE * 15, TILE_SIZE * 5, 'package_placeholder').setOrigin(0, 0).setInteractive();
        package_sprite.on('pointerdown', () => this.handlePackageInteraction());

        const note_sprite = this.add.image(TILE_SIZE * 16, TILE_SIZE * 5, 'note_placeholder').setOrigin(0, 0).setInteractive();
        note_sprite.on('pointerdown', () => this.showClueNote());

        // 5. Puntos de viaje
        this.createTravelPoint(TILE_SIZE * 3, TILE_SIZE * 10, 'Valencia', 2, 'Cajas');
        this.createTravelPoint(TILE_SIZE * 18, TILE_SIZE * 2, 'Valladolid', 0, 'Interruptores');
        this.createTravelPoint(TILE_SIZE * 22, TILE_SIZE * 12, 'Japon', 6, 'Preguntas');

        this.events.on('playerStopMove', this.checkRandomEncounter, this);
    }

    update() {
        this.player.updateMovement();

        if (!this.player.isMoving) {
            this.handleInput();
        }
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

    private handlePackageInteraction() {
        if (this.gm.checkCode()) {
            alert(`¡CÓDIGO CORRECTO: ${this.gm.correctCode}! ¡FELIZ CUMPLE 22!`);
        } else {
            alert(`El paquete está bloqueado. ${this.gm.getStatus()}`);
        }
    }

    private showClueNote() {
        alert(
            "Pista: ¡Feliz 22! El primer dígito (2) te espera al Sur, cerca de Valencia. El segundo (0), al Norte. El tercero (6), lejos, al Este. Encuentra los tres en ORDEN para abrir el paquete."
        );
    }

    private createTravelPoint(
        x: number,
        y: number,
        loc: string,
        digit: number,
        type: 'Cajas' | 'Interruptores' | 'Preguntas'
    ) {
        const point = this.add.text(
            x,
            y,
            `[Viajar a ${loc}]`,
            {
                backgroundColor: '#FF8888',
                padding: { x: 5, y: 5 },
                color: '#000'
            }
        )
        .setOrigin(0, 0)
        .setInteractive();

        point.on('pointerdown', () => {
            this.scene.start('PuzzleScene', { location: loc, digit: digit, type: type });
        });
    }

    private checkRandomEncounter() {
        if (Math.random() < 0.015) {
            this.scene.start('BattleScene');
        }
    }

    private showDebugWalls(layer: Phaser.Tilemaps.TilemapLayer) {
        const debugGraphics = this.add.graphics().setAlpha(0.75);
        layer.renderDebug(debugGraphics, {
            tileColor: null,
            collidingTileColor: new Phaser.Display.Color(243, 234, 48, 255),
            faceColor: new Phaser.Display.Color(40, 39, 37, 255)
        });
    }
}
