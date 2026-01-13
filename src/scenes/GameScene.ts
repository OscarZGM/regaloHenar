import { InterfaceScene } from './InterfaceScene';
import { Player } from '../classes/Player';
import { GameManager } from '../classes/GameManager';
import { DialogBox } from '../classes/DialogBox'; // Removing if not needed, but checking imports

// Interfaces (or import them if they are in a types file, but defining here for now as they seem local)
interface MapConfig {
    key: string;
    tilemap: string;
    map_before: string;
    spawn: { x: number, y: number };
    exits: Array<{
        xRange: [number, number];
        yRange: [number, number];
        targetMap: string;
        targetSpawn: { x: number, y: number };
    }>;
}

const TILE_SIZE = 32;

export class GameScene extends Phaser.Scene {
    private player!: Player;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private gm: GameManager = GameManager.getInstance();
    private map!: Phaser.Tilemaps.Tilemap;
    private collisionLayer!: Phaser.Tilemaps.TilemapLayer;
    public groundLayer!: Phaser.Tilemaps.TilemapLayer;
    private currentMapKey: string = 'house';
    private spawnOverride?: { x: number, y: number };
    private enemies!: Phaser.GameObjects.Group;
    private isTransitioningToBattle: boolean = false;

    // Helper to access UIScene
    private get uiScene(): InterfaceScene {
        return this.scene.get('InterfaceScene') as InterfaceScene;
    }

    private updateHUD(text: string) {
        this.uiScene?.updateHUD(text);
    }

    private showDialog(text: string, callback?: () => void) {
        this.uiScene?.showDialog(text, callback);
    }

    private isDialogVisible(): boolean {
        return this.uiScene?.isDialogVisible() || false;
    }

    private dialogBoxVisible(): boolean { // Alias for compatibility with existing code
        return this.isDialogVisible();
    }


    private mapConfigs: Record<string, MapConfig> = {
        house: {
            key: 'house',
            tilemap: 'house_map',
            map_before: 'house',
            spawn: { x: 12, y: 8 },
            exits: [
                // Salida Japón (Derecha - Y=8,9,10)
                { xRange: [24, 24], yRange: [8, 10], targetMap: 'japon', targetSpawn: { x: 1, y: 8 } },
                // Salida Valladolid (Arriba - X=11,12,13)
                { xRange: [11, 13], yRange: [0, 0], targetMap: 'valladolid', targetSpawn: { x: 10, y: 13 } },
                // Salida Valencia (Abajo - X=11,12,13)
                { xRange: [11, 13], yRange: [17, 17], targetMap: 'valencia', targetSpawn: { x: 10, y: 1 } }
            ]
        },
        valencia: {
            key: 'valencia',
            tilemap: 'valencia_map',
            map_before: 'valencia',
            spawn: { x: 10, y: 1 },
            exits: [
                // Salida Casa (Arriba - X=9,10,11)
                { xRange: [9, 11], yRange: [0, 0], targetMap: 'house', targetSpawn: { x: 12, y: 16 } }
            ]
        },
        valladolid: {
            key: 'valladolid',
            tilemap: 'valladolid_map',
            map_before: 'valladolid',
            spawn: { x: 10, y: 13 },
            exits: [
                // Salida Casa (Abajo - X=9,10,11)
                { xRange: [9, 11], yRange: [14, 14], targetMap: 'house', targetSpawn: { x: 12, y: 1 } }
            ]
        },
        japon: {
            key: 'japon',
            tilemap: 'japon_map',
            map_before: 'japon',
            spawn: { x: 1, y: 8 },
            exits: [
                // Salida Casa (Izquierda - Y=7,8,9)
                { xRange: [0, 0], yRange: [7, 9], targetMap: 'house', targetSpawn: { x: 23, y: 9 } }
            ]
        }
    };

    // 🚩 Quiz Data
    private currentQuestionIndex: number = 0;
    private quizQuestions = [
        {
            q: "1. ¿Cómo te llamo yo? (o al menos cual es el más representativo)",
            options: ["mi niña", "mi novia", "mi guarrindonga", "Mi reina"],
            correct: "Mi reina"
        },
        {
            q: "2. ¿Cómo se llamaba el restaurante al que pedíamos en Valencia?",
            options: ["Sapporo", "Pizzeria Nap081", "Pizzeria Quesada", "Sapori di Italia"],
            correct: "Sapori di Italia"
        },
        {
            q: "3. ¿Cuál es mi pokemon favorito?",
            options: ["Zoroak", "Yveltal", "Vaporeon", "Ditto"],
            correct: "Ditto"
        }
    ];

    // 🚩 SISTEMA DE MENÚS (Input Overhaul)
    private isMenuOpen: boolean = false;
    private menuOptions: Array<{ textObj: Phaser.GameObjects.Text | Phaser.GameObjects.Container, callback: () => void }> = [];
    private selectedOptionIndex: number = 0;
    private menuOnCancel?: () => void;

    constructor() {
        super('GameScene');
    }

    init(data: { mapKey?: string, spawnX?: number, spawnY?: number }) {
        if (data.mapKey) {
            this.currentMapKey = data.mapKey;
        }

        if (typeof data.spawnX === 'number' && typeof data.spawnY === 'number') {
            this.spawnOverride = { x: data.spawnX, y: data.spawnY };
        }
    }

    preload() {
        // Cargar spritesheet para animaciones del jugador
        this.load.image('tiles', 'assets/images/tileset.png');
        this.load.spritesheet('player_placeholder', 'assets/images/player.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Cargar el resto de assets
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
        this.createPlayerAnimations();
        this.createPlayer();

        // Inicializar el grupo de enemigos
        this.enemies = this.add.group();

        this.player.play('idle_down');

        this.setupControls();
        this.createInteractables();

        // 🚩 Start UI Scene
        this.scene.launch('InterfaceScene');
        this.createUI(); // Keep structure, but delegate logic


        this.events.on('playerStopMove', this.onPlayerStopMove, this);
        this.events.on('resume', this.onResume, this);
    }

    // Método para definir todas las animaciones del jugador
    private createPlayerAnimations() {
        const frameRate = 6;

        this.anims.create({
            key: 'walk_down', frames: this.anims.generateFrameNumbers('player_placeholder', { start: 0, end: 3 }),
            frameRate: frameRate, repeat: -1
        });
        this.anims.create({
            key: 'walk_left', frames: this.anims.generateFrameNumbers('player_placeholder', { start: 4, end: 7 }),
            frameRate: frameRate, repeat: -1
        });
        this.anims.create({
            key: 'walk_right', frames: this.anims.generateFrameNumbers('player_placeholder', { start: 8, end: 11 }),
            frameRate: frameRate, repeat: -1
        });
        this.anims.create({
            key: 'walk_up', frames: this.anims.generateFrameNumbers('player_placeholder', { start: 12, end: 15 }),
            frameRate: frameRate, repeat: -1
        });

        this.anims.create({ key: 'idle_down', frames: [{ key: 'player_placeholder', frame: 0 }] });
        this.anims.create({ key: 'idle_left', frames: [{ key: 'player_placeholder', frame: 4 }] });
        this.anims.create({ key: 'idle_right', frames: [{ key: 'player_placeholder', frame: 8 }] });
        this.anims.create({ key: 'idle_up', frames: [{ key: 'player_placeholder', frame: 12 }] });
    }

    private loadMap(mapKey: string) {
        if (this.map) {
            this.map.destroy();
        }

        const config = this.mapConfigs[mapKey];
        this.map = this.make.tilemap({ key: config.tilemap });
        const tileset = this.map.addTilesetImage('RPG Nature Tileset', 'tiles')!;

        this.groundLayer = this.map.createLayer('Ground', tileset, 0, 0)!;
        this.collisionLayer = this.map.createLayer('Collision', tileset, 0, 0)!;

        this.collisionLayer.setCollisionByProperty({ isSolid: true });
        this.collisionLayer.setVisible(false);

        // 🚩 Calcular Zoom para llenar toda la pantalla
        const canvasWidth = this.sys.game.canvas.width;
        const canvasHeight = this.sys.game.canvas.height;

        const zoomX = canvasWidth / this.map.widthInPixels;
        const zoomY = canvasHeight / this.map.heightInPixels;
        const zoom = Math.max(zoomX, zoomY, 1); // Nunca hacer zoom out, solo in o 1

        this.cameras.main.setZoom(zoom);

        // Centrar después del zoom
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        if (this.map.widthInPixels * zoom < canvasWidth || this.map.heightInPixels * zoom < canvasHeight) {
            this.cameras.main.centerOn(this.map.widthInPixels / 2, this.map.heightInPixels / 2);
        } else {
            // Si el mapa es más grande que la pantalla (con zoom), seguir al jugador luego
        }
    }

    private createPlayer() {
        const config = this.mapConfigs[this.currentMapKey];

        // Prefer spawn override (passed when transitioning), otherwise map default
        const spawnTile = this.spawnOverride ?? config.spawn;
        const spawnX = spawnTile.x * TILE_SIZE;
        const spawnY = spawnTile.y * TILE_SIZE;

        // Clear override after use
        this.spawnOverride = undefined;

        if (this.player) {
            this.player.destroy();
        }

        this.player = new Player(this, spawnX, spawnY, 'player_placeholder', this.collisionLayer, this.groundLayer);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }


    // 🚩 Lógica de Navegación de Menú
    private navigateMenu(direction: number) {
        if (this.menuOptions.length === 0) return;

        // Deseleccionar actual
        this.highlightOption(this.selectedOptionIndex, false);

        // Mover índice
        this.selectedOptionIndex += direction;
        if (this.selectedOptionIndex < 0) this.selectedOptionIndex = this.menuOptions.length - 1;
        if (this.selectedOptionIndex >= this.menuOptions.length) this.selectedOptionIndex = 0;

        // Seleccionar nuevo
        this.highlightOption(this.selectedOptionIndex, true);
    }

    private selectMenuOption() {
        if (this.menuOptions.length === 0) return;
        const option = this.menuOptions[this.selectedOptionIndex];
        if (option && option.callback) {
            option.callback();
        }
    }

    private highlightOption(index: number, isSelected: boolean) {
        const option = this.menuOptions[index];
        if (!option) return;

        // Buscar el texto dentro del container si es container, o el texto directo
        let textObj: Phaser.GameObjects.Text | null = null;
        let bgObj: Phaser.GameObjects.Rectangle | null = null;

        if (option.textObj instanceof Phaser.GameObjects.Container) {
            textObj = option.textObj.list.find(c => c instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text;
            bgObj = option.textObj.list.find(c => c instanceof Phaser.GameObjects.Rectangle) as Phaser.GameObjects.Rectangle;
        } else if (option.textObj instanceof Phaser.GameObjects.Text) {
            textObj = option.textObj;
        }

        if (textObj) {
            textObj.setColor(isSelected ? '#ffff00' : '#ffffff');
            textObj.setText(isSelected ? `> ${textObj.text.replace('> ', '')}` : textObj.text.replace('> ', ''));
        }
        if (bgObj) {
            bgObj.setStrokeStyle(isSelected ? 2 : 0, 0xffff00);
        }
    }

    // 🚩 Helper para abrir menús
    private openMenu(options: Array<{ text: string, callback: () => void }>, onCancel?: () => void, containerBuilder?: (opt: any, idx: number) => any) {
        this.isMenuOpen = true;
        this.menuOptions = []; // Se llenará en el builder
        this.selectedOptionIndex = 0;
        this.menuOnCancel = onCancel;

        // La construcción visual se delega al caller (quiz/vending), 
        // pero aquí gestionamos la lista lógica.
    }

    private closeMenu() {
        this.isMenuOpen = false;
        this.menuOptions = [];
        this.menuOnCancel = undefined;
    }

    private createUI() {
        // UI is now handled by UIScene
        // Initial HUD update
        this.time.delayedCall(100, () => {
            this.updateHUD(`${this.gm.getStatus()} | Mapa: ${this.currentMapKey}`);
        });
    }

    private createInteractables() {
        if (this.currentMapKey === 'house') {
            this.createHouseInteractables();
        } else if (this.currentMapKey === 'valencia') {
            this.createValenciaInteractables();
        } else if (this.currentMapKey === 'valladolid') {
            this.createValladolidInteractables();
        } else if (this.currentMapKey === 'japon') {
            this.createJaponInteractables();
        }
    }

    private createHouseInteractables() {
        const pkg = this.add.sprite(15 * TILE_SIZE, 5 * TILE_SIZE, 'package_placeholder')
            .setOrigin(0, 0)
            .setInteractive()
            .setData('type', 'package');

        this.createNPC(10 * TILE_SIZE, 8 * TILE_SIZE, 'Hola! Bienvenida a tu cumpleaños cielillo. Este (intento de) lugar está lleno de recuerdos de nosotros. He escuchado que hay tres sitios importantes que debes visitar para desbloquear tu codigo...');
    }

    private createValladolidInteractables() {
        // NPC del Quiz
        const npc = this.add.sprite(10 * TILE_SIZE, 8 * TILE_SIZE, 'npc_placeholder')
            .setOrigin(0, 0)
            .setInteractive()
            .setData('type', 'quiz_npc');
    }

    private createJaponInteractables() {
        // Vending Machine
        const machine = this.add.rectangle(15 * TILE_SIZE, 5 * TILE_SIZE, 32, 64, 0xff0000)
            .setOrigin(0, 0)
            .setInteractive()
            .setData('type', 'vending_machine');

        // Items (Yenes)
        const yenPositions = [{ x: 5, y: 10 }, { x: 12, y: 12 }, { x: 8, y: 5 }];
        yenPositions.forEach((pos, index) => {
            if (!this.gm.collectedYens.includes(index)) {
                this.add.circle(pos.x * TILE_SIZE + 16, pos.y * TILE_SIZE + 16, 5, 0xffff00)
                    .setDepth(5)
                    .setInteractive()
                    .setData('type', 'yen')
                    .setData('id', index);
            }
        });
    }

    private createValenciaInteractables() {
        // En vez de pasar dialogo fijo, asignamos ID para resolucion dinamica
        this.createNPC(10 * TILE_SIZE, 7 * TILE_SIZE, '', 'valencia_npc');

        if (!this.gm.valenciaEnemiesDefeated) {
            this.createEnemies();
        }
    }

    // 🚩 NUEVO: Método para crear enemigos visibles
    private createEnemies() {
        // Posiciones de los enemigos en Valencia (Tile X, Tile Y)
        const enemyPositions = [
            { x: 5, y: 5 },
            { x: 15, y: 10 }
        ];

        enemyPositions.forEach((pos, idx) => {
            const enemyId = `valencia_enemy_${idx}`;
            if (this.gm.defeatedEnemies.includes(enemyId)) return; // Skip if defeated

            const enemy = this.add.sprite(
                pos.x * TILE_SIZE,
                pos.y * TILE_SIZE,
                'enemy_placeholder'
            )
                .setOrigin(0, 0) // Usar 0,0 para alinearse con la cuadrícula del mapa
                .setInteractive()
                .setData('type', 'enemy')
                .setData('id', enemyId) // Store ID
                .setDepth(10);

            this.enemies.add(enemy);
        });
    }

    private createNPC(x: number, y: number, dialog: string, id?: string) {
        const npc = this.add.sprite(x, y, 'npc_placeholder')
            .setOrigin(0, 0)
            .setInteractive()
            .setData('type', 'npc')
            .setData('dialog', dialog);

        if (id) npc.setData('id', id);
    }

    update() {
        if (this.player) {
            this.player.updateMovement();

            if (!this.player.isMoving && !this.isDialogVisible()) {
                this.handleInput();
                this.checkEnemyCollision(); // 🚩 Comprobar colisión con enemigos
            }
        }

        this.updateHUD(`${this.gm.getStatus()} | Mapa: ${this.currentMapKey}`);

        // 🚩 Botón Combinar Corazones
        // ❌ ELIMINADO: Botón Combinar Corazones (Ahora es via NPC)
    }

    // 🚩 NUEVO: Método para comprobar la colisión con el grupo de enemigos
    private checkEnemyCollision() {
        if (this.currentMapKey !== 'valencia') return;

        // Verificar el cooldown (30 segundos) si el jugador perdió recientemente
        const COOLDOWN_DURATION = 30000; // 30 segundos
        if (this.gm.lastBattleTime > 0 && Date.now() < this.gm.lastBattleTime + COOLDOWN_DURATION) {
            return; // No hay colisión durante el cooldown
        }

        this.enemies.getChildren().forEach(enemy => {
            const sprite = enemy as Phaser.GameObjects.Sprite;

            const dist = Phaser.Math.Distance.Between(
                this.player.x + TILE_SIZE / 2,
                this.player.y + TILE_SIZE / 2,
                sprite.x + TILE_SIZE / 2,
                sprite.y + TILE_SIZE / 2
            );

            if (dist < TILE_SIZE * 1.2) {
                this.handleEnemyEncounter(sprite);
            }
        });
    }

    // 🚩 Restaurar estado al volver de batalla
    private onResume(sys: Phaser.Scenes.Systems, data: any) {
        this.isTransitioningToBattle = false;

        // Limpiar enemigos derrotados
        [...this.enemies.getChildren()].forEach(child => {
            const enemy = child as Phaser.GameObjects.Sprite;
            const id = enemy.getData('id');
            if (this.gm.defeatedEnemies.includes(id)) {
                enemy.destroy();
            }
        });

        if (this.cursors) {
            this.cursors.left?.reset();
            this.cursors.right?.reset();
            this.cursors.up?.reset();
            this.cursors.down?.reset();
        }
        // Restore controls (registry callbacks) as BattleScene might have overridden them
        this.setupControls();
    }

    private handleEnemyEncounter(enemy: Phaser.GameObjects.Sprite) {
        if (this.isDialogVisible() || this.scene.isActive('BattleScene') || this.isTransitioningToBattle) return;

        this.isTransitioningToBattle = true;

        // 🚩 NUEVO: Resetear el cooldown después de entrar en una nueva batalla
        this.gm.lastBattleTime = 0;

        this.cameras.main.flash(500, 255, 0, 0);

        // Pausar GameScene y lanzar BattleScene
        this.time.delayedCall(500, () => {
            enemy.destroy(); // El enemigo se destruye al entrar en combate
            this.scene.pause();
            this.scene.launch('BattleScene', {
                returnScene: 'GameScene',
                returnData: { mapKey: this.currentMapKey },
                enemyId: enemy.getData('id') // Pass ID
            });
        });
    }

    // 🚩 HELPER: Input Unificado
    private setupControls() {
        this.cursors = this.input.keyboard!.createCursorKeys();

        let lastInputTime = 0;
        const inputCooldown = 200; // ms

        const handleUp = () => {
            const now = this.time.now;
            if (this.isMenuOpen && now - lastInputTime > inputCooldown) {
                this.navigateMenu(-1);
                lastInputTime = now;
            }
        };
        const handleDown = () => {
            const now = this.time.now;
            if (this.isMenuOpen && now - lastInputTime > inputCooldown) {
                this.navigateMenu(1);
                lastInputTime = now;
            }
        };

        const handleConfirm = () => {
            const now = this.time.now;
            if (now - lastInputTime < inputCooldown) return;
            lastInputTime = now;

            // 1. Prioridad: DialogBox
            if (this.isDialogVisible()) {
                this.uiScene.handleDialogConfirm();
                return;
            }

            // 2. Prioridad: Menú Abierto
            if (this.isMenuOpen) {
                this.selectMenuOption();
                return;
            }

            // 3. Default: Interacción Mundo
            this.handleInteraction();
        };

        const handleCancel = () => {
            const now = this.time.now;
            if (this.isMenuOpen && this.menuOnCancel && now - lastInputTime > inputCooldown) {
                this.menuOnCancel();
                lastInputTime = now;
            }
        };

        // Teclado Listener
        this.input.keyboard?.on('keydown-UP', handleUp);
        this.input.keyboard?.on('keydown-DOWN', handleDown);

        this.input.keyboard?.on('keydown-SPACE', handleConfirm);
        this.input.keyboard?.on('keydown-A', handleConfirm);

        this.input.keyboard?.on('keydown-Z', handleCancel);

        // Touch Registry (Map UI Scene Calls Only)
        // Wrappers for registry strict calls (no coalescing needed if logic matches)
        this.registry.set('input_up', handleUp);
        this.registry.set('input_down', handleDown);
        this.registry.set('input_confirm', handleConfirm);
        this.registry.set('input_cancel', handleCancel);

        // NOTE: Virtual Cursors (virtual_cursor_up/down/etc) are set by UIScene directly.
    }

    private handleInput() {
        if (this.isMenuOpen || this.dialogBoxVisible()) return;

        let direction = new Phaser.Math.Vector2(0, 0);

        // Keyboard OR Virtual Cursor (Registry)
        const vUp = this.registry.get('virtual_cursor_up');
        const vDown = this.registry.get('virtual_cursor_down');
        const vLeft = this.registry.get('virtual_cursor_left');
        const vRight = this.registry.get('virtual_cursor_right');

        if (this.cursors.up?.isDown || vUp) direction.y = -1;
        else if (this.cursors.down?.isDown || vDown) direction.y = 1;
        else if (this.cursors.left?.isDown || vLeft) direction.x = -1;
        else if (this.cursors.right?.isDown || vRight) direction.x = 1;

        if (direction.x !== 0) direction.y = 0;

        if (direction.length() > 0) {
            this.player.tryMove(direction);
        }
    }

    private onPlayerStopMove() {
        this.checkMapTransition();
    }

    private checkMapTransition() {
        const config = this.mapConfigs[this.currentMapKey];
        const playerTileX = Math.floor(this.player.x / TILE_SIZE);
        const playerTileY = Math.floor(this.player.y / TILE_SIZE);

        for (const exit of config.exits) {
            const inX = playerTileX >= exit.xRange[0] && playerTileX <= exit.xRange[1];
            const inY = playerTileY >= exit.yRange[0] && playerTileY <= exit.yRange[1];

            if (inX && inY) {
                this.transitionToMap(exit.targetMap, exit.targetSpawn, exit);
                return;
            }
        }
    }

    private transitionToMap(mapKey: string, spawn: { x: number, y: number }, exit?: { xRange: [number, number], yRange: [number, number], targetMap: string, targetSpawn: { x: number, y: number } }) {
        // Ajustar spawn si vamos hacia la casa desde un mapa concreto
        let finalSpawn = { ...spawn };

        if (mapKey === 'house') {
            switch (this.currentMapKey) {
                case 'valencia':
                    // Venimos desde abajo de la casa: dejar 1 bloque más dentro
                    finalSpawn.y = spawn.y + 1;
                    break;
                case 'valladolid':
                    // Venimos desde arriba de la casa: dejar 1 bloque más dentro
                    finalSpawn.y = spawn.y - 1;
                    break;
                case 'japon':
                    // Venimos desde la derecha de la casa: dejar 1 bloque más dentro
                    finalSpawn.x = spawn.x - 1;
                    break;
                default:
                    break;
            }
        }

        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.restart({ mapKey: mapKey, spawnX: finalSpawn.x, spawnY: finalSpawn.y });
        });
    }

    private handleInteraction() {
        if (this.isDialogVisible()) return;

        const nearbyObjects = this.children.list.filter(obj => {
            // 🚩 FIX: Permitir cualquier objeto con 'type' (Sprites, Shapes, Containers)
            if (!obj.getData) return false;
            if (!obj.getData('type')) return false;

            // Type assertion seguro ya que sabemos que es un GameObject
            const gameObj = obj as Phaser.GameObjects.Sprite | Phaser.GameObjects.Shape | Phaser.GameObjects.Container;

            // Containers no tienen x/y directos a veces si no se setean, pero en este caso sí.
            // Usamos coordenadas de mundo.
            const dist = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                gameObj.x, gameObj.y
            );
            return dist < TILE_SIZE * 1.5;
        });

        if (nearbyObjects.length > 0) {
            const obj = nearbyObjects[0] as Phaser.GameObjects.Sprite;
            this.interactWithObject(obj);
        }
    }

    private handleBack() {
        if (this.isMenuOpen && this.menuOnCancel) {
            this.menuOnCancel();
            return;
        }

        // Si hay caja de dialogo, avanzarla o cerrarla
        // Si hay caja de dialogo, avanzarla o cerrarla
        if (this.isDialogVisible()) {
            // Opcional: permitir cerrar dialogo con B si se desea
        }
    }



    private interactWithObject(obj: Phaser.GameObjects.Sprite) {
        const type = obj.getData('type');

        switch (type) {
            case 'package':
                this.handlePackageInteraction();
                break;
            case 'note':
                this.showClueNote();
                break;
            case 'npc':
                const npcId = obj.getData('id');
                if (npcId === 'valencia_npc') {
                    this.handleValenciaNPC();
                } else if (npcId === 'quiz_npc') {
                    this.handleQuizNPC();
                } else {
                    const dialog = obj.getData('dialog');
                    this.showDialog(dialog);
                }
                break;
            case 'quiz_npc':
                this.handleQuizNPC();
                break;
            case 'yen':
                this.gm.yenCount++;
                const yenId = obj.getData('id');
                if (yenId !== undefined) {
                    this.gm.collectedYens.push(yenId);
                }
                obj.destroy();
                this.showDialog(`¡Has encontrado 1 Yen! Total: ${this.gm.yenCount}`);
                break;
            case 'vending_machine':
                this.handleVendingMachine();
                break;
            case 'enemy':
                // Usually handled by collision, but if clicked...
                break;
        }
    }

    // 🚩 Logic Valencia NPC separada para texto dinámico
    private handleValenciaNPC() {
        let dialog = 'Valencia... la ciudad de las cucarachas. Aquí nuestro amor se fortaleció entre siestas y pasta de sobre...';

        // Si ya tiene el digito
        if (this.gm.hasCombinedHearts) {
            dialog = "¡Gracias por unir el corazón! Recuerda, el dígito es: 2. ¡Ve a al Norte o al Este!";
            this.showDialog(dialog);
            return;
        }

        // Si tiene los corazones pero no los ha entregado
        if (this.gm.valenciaEnemiesDefeated && this.gm.heartsCollected >= 2) {
            dialog = "¡Gracias por entregarme tu corazón! Yo te doy el mío. Tienes el dígito 2.";
            this.gm.hasCombinedHearts = true;
            this.gm.cluesFound.valencia = 2; // Fix: Valencia is the first digit (2)
            this.showDialog(dialog);
            return;
        }

        // Default
        this.showDialog(dialog + " Reúne las dos mitades del corazón...");
    }

    private handleQuizNPC() {
        if (this.gm.quizCompleted) {
            this.showDialog("¡Ya has demostrado cuánto me conoces! El dígito de Valladolid es: 0");
            return;
        }

        this.currentQuestionIndex = 0;
        this.showDialog("¡Bienvenida a Pusela ! Responde estas preguntas para obtener tu dígito.", () => {
            this.askQuizQuestion();
        });
    }

    private askQuizQuestion() {
        if (this.currentQuestionIndex >= this.quizQuestions.length) {
            this.gm.quizCompleted = true;
            this.gm.cluesFound.valladolid = 0; // Fix: Valladolid is the middle digit (0)
            this.showDialog("¡Correcto! Has respondido todo bien. El dígito de Valladolid es: 0");
            return;
        }

        const q = this.quizQuestions[this.currentQuestionIndex];
        // Pequeño delay para evitar bloqueo de input immediate
        this.time.delayedCall(100, () => {
            this.showDialog(`${q.q}`, () => {
                this.showQuizOptions(q);
            });
        });
    }

    private showQuizOptions(q: { options: string[], correct: string }) {
        const zoom = this.cameras.main.zoom;
        const invZoom = 1 / zoom;
        const centerX = (this.sys.game.canvas.width * invZoom) / 2;
        const startY = (this.sys.game.canvas.height * invZoom) * 0.4;
        const btnHeight = 40 * invZoom;
        const spacing = 10 * invZoom;

        const buttons: Phaser.GameObjects.Container[] = [];
        const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);

        // Inicializar Menu
        this.isMenuOpen = true;
        this.menuOptions = [];
        this.selectedOptionIndex = 0;
        this.menuOnCancel = undefined;

        shuffledOptions.forEach((opt, idx) => {
            const yPos = startY + idx * (btnHeight + spacing);
            const btn = this.add.container(centerX, yPos).setDepth(300).setScrollFactor(0).setScale(invZoom);

            const bg = this.add.rectangle(0, 0, 300, 40, 0x000000);
            const text = this.add.text(0, 0, opt, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

            btn.add([bg, text]);
            buttons.push(btn);

            this.menuOptions.push({
                textObj: btn,
                callback: () => {
                    buttons.forEach(b => b.destroy());
                    this.closeMenu();

                    if (opt === q.correct) {
                        this.currentQuestionIndex++;
                        // Feedback Inmediato
                        this.showDialog("¡Correcto!", () => {
                            // Next Question (triggered via callback)
                            this.askQuizQuestion();
                        });
                    } else {
                        this.showDialog("Incorrecto... intenémoslo de nuevo.", () => {
                            this.currentQuestionIndex = 0; // Reiniciar
                        });
                    }
                }
            });
        });

        this.highlightOption(0, true);
    }

    private handleVendingMachine() {
        if (this.gm.yenCount <= 0) {
            this.showDialog("Necesitas al menos 1 Yen para usar la máquina.");
            return;
        }

        const options = ["Coca Cola Zero", "Agua", "Zumo de Guayaba", "Monster", "Sake"];
        this.showVendingOptions(options);
    }

    private showVendingOptions(options: string[]) {
        const zoom = this.cameras.main.zoom;
        const invZoom = 1 / zoom;
        const centerX = (this.sys.game.canvas.width * invZoom) / 2;
        const startY = (this.sys.game.canvas.height * invZoom) * 0.3;
        const btnHeight = 40 * invZoom;
        const spacing = 10 * invZoom;

        const buttons: Phaser.GameObjects.Container[] = [];

        this.add.text(centerX, startY - 50 * invZoom, "Elige una bebida (1 Yen)", {
            fontSize: `${24 * invZoom}px`, backgroundColor: '#000', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setName('vendingTitle').setScale(1);

        // Inicializar Menu
        this.isMenuOpen = true;
        this.menuOptions = []; // Limpiar
        this.selectedOptionIndex = 0;

        const cleanup = () => {
            this.children.getByName('vendingTitle')?.destroy();
            buttons.forEach(b => b.destroy());
            this.closeMenu();
        };

        this.menuOnCancel = cleanup;

        options.forEach((opt, idx) => {
            const yPos = startY + idx * (btnHeight + spacing);
            const btn = this.add.container(centerX, yPos).setDepth(300).setScrollFactor(0).setScale(invZoom);

            const bg = this.add.rectangle(0, 0, 300, 40, 0x333333); // Sin interactive
            const text = this.add.text(0, 0, opt, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

            btn.add([bg, text]);
            buttons.push(btn);

            // Registrar Opción
            this.menuOptions.push({
                textObj: btn,
                callback: () => {
                    cleanup();
                    this.processVendingChoice(opt);
                }
            });
        });

        // Botón Cancelar (Como opción de menú también, para poder seleccionarla)
        const cancelY = startY + options.length * (btnHeight + spacing) + 20 * invZoom;
        const cancelBtn = this.add.text(centerX, cancelY, "Cancelar", {
            fontSize: `${20 * invZoom}px`, backgroundColor: '#550000'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(300); // Sin interactive

        buttons.push(cancelBtn as any); // Hack de tipo para el array de cleanup

        this.menuOptions.push({
            textObj: cancelBtn,
            callback: cleanup
        });

        // Highlight Inicial
        this.highlightOption(0, true);
    }

    private processVendingChoice(choice: string) {
        if (choice === 'Coca Cola Zero') {
            if (this.gm.hasCola) {
                this.showDialog("Ya tienes la CocaCola. ¡Mira debajo de la lata!");
            } else if (this.gm.yenCount > 0) {
                this.gm.yenCount--;
                this.gm.hasCola = true;
                this.gm.cluesFound.japon = 6;
                this.showDialog("¡Has comprado una CocaCola!\nEn la lata se puede leer el número: 6");
            } else {
                this.showDialog("No tienes suficientes Yenes.");
            }
        } else if (choice === 'Sake') {
            if (this.gm.hasCola) {
                // Easter Egg
                this.showDialog("Japon 2026¿? :))");
            } else {
                this.showDialog("Agotado. Te devuelven el Yen.");
            }
        } else {
            this.showDialog("Agotado. Te devuelven el Yen.");
        }
    }

    private handlePackageInteraction() {
        if (this.gm.checkCode()) {
            this.showDialog(
                `¡CÓDIGO CORRECTO: ${this.gm.correctCode}! \nPuedes abrir tu regalo ya, el codigo es el mismo, te quiero mucho mi reina`,
                () => {
                    this.cameras.main.fadeOut(2000);
                    this.time.delayedCall(2000, () => {
                        this.scene.start('VictoryScene');
                    });
                }
            );
        } else {
            this.showDialog(`El paquete está bloqueado. ${this.gm.getStatus()} Necesitas encontrar los 3 dígitos en orden: Valencia, Valladolid, Japón.`);
        }
    }

    private showClueNote() {
        this.showDialog(
            "📝 Pista Principal:\n\n" +
            "¡Feliz 22 añitos! Tu regalo especial te espera, pero primero debes recordar...\n\n" +
            "🌴 El primer dígito te espera en Valencia al Sur - un sitio inolvidable para ambos.\n" +
            "🏛️ El segundo dígito está en Valladolid al Norte - donde comenzó nuestra historia.\n" +
            "🗾 El tercero en Japón al Este - nuestro viaje soñado.\n\n" +
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