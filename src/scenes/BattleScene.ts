// src/scenes/BattleScene.ts
import Phaser from 'phaser';
import { GameManager } from '../classes/GameManager';

enum BattleState {
    START,
    PLAYER_TURN,
    ENEMY_TURN,
    ANIMATING,
    WON,
    LOST
}

interface BattleData {
    returnScene: string;
    returnData?: any;
    enemyId?: string; // 🚩 Identificador único del enemigo
}

export class BattleScene extends Phaser.Scene {
    private state: BattleState = BattleState.START;
    private playerHP: number = 100;
    private playerMaxHP: number = 100;
    private enemyHP: number = 60;
    private enemyMaxHP: number = 60;
    private hpText!: Phaser.GameObjects.Text;
    private fightLog!: Phaser.GameObjects.Text;
    private playerSprite!: Phaser.GameObjects.Sprite;
    private enemySprite!: Phaser.GameObjects.Sprite;


    // 🚩 Menu Refactor
    private menuButtons: Phaser.GameObjects.Text[] = []; // Visuals
    private menuActions: Array<{ text: string, callback: () => void }> = []; // Logic
    private selectedActionIndex: number = 0;

    private battleData!: BattleData;
    private playerHPBar!: Phaser.GameObjects.Graphics;
    private enemyHPBar!: Phaser.GameObjects.Graphics;
    private potions: number = 2;

    constructor() {
        super('BattleScene');
    }

    init(data: BattleData) {
        this.battleData = data;
    }

    create() {
        this.state = BattleState.START;
        this.playerHP = this.playerMaxHP;
        this.enemyHP = this.enemyMaxHP;

        // Fondo con gradiente
        const bg = this.add.rectangle(400, 300, 800, 600, 0x000000);
        const gradient = this.add.graphics();
        gradient.fillGradientStyle(0x1a0033, 0x1a0033, 0x4a0080, 0x4a0080, 1);
        gradient.fillRect(0, 0, 800, 600);

        // Título
        this.add.text(400, 40, '¡Combate Salvaje!', {
            fontSize: '42px',
            color: '#FFD700',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Sprites
        this.playerSprite = this.add.sprite(200, 350, 'player_placeholder')
            .setScale(3)
            .setOrigin(0.5);

        this.enemySprite = this.add.sprite(600, 300, 'enemy_placeholder')
            .setScale(3)
            .setOrigin(0.5);

        // Barras de HP
        this.createHPBars();

        // Información de estado
        this.hpText = this.add.text(50, 80, '', {
            fontSize: '22px',
            color: '#FFFFFF',
            fontStyle: 'bold',
            backgroundColor: '#000000aa',
            padding: { x: 15, y: 10 }
        });
        this.updateHPDisplay();

        // Log de batalla
        this.fightLog = this.add.text(400, 480, 'El enemigo aparece...', {
            fontSize: '20px',
            color: '#FFD700',
            align: 'center',
            backgroundColor: '#000000cc',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // Animación de entrada
        this.enemySprite.setAlpha(0);
        this.tweens.add({
            targets: this.enemySprite,
            alpha: 1,
            duration: 1000,
            ease: 'Power2'
        });

        this.time.delayedCall(1500, () => {
            this.state = BattleState.PLAYER_TURN;
            this.updateMenu('¡Tu turno! Elige una acción.');
        });

        // 🚩 HELPER: Input Battle
        const handleUp = () => { if (this.state === BattleState.PLAYER_TURN) this.navigateMenu(-1); };
        const handleDown = () => { if (this.state === BattleState.PLAYER_TURN) this.navigateMenu(1); };
        const handleConfirm = () => { if (this.state === BattleState.PLAYER_TURN) this.executeMenuAction(); };
        const handleCancel = () => { /* Battle usually doesn't have back unless in submenu */ };

        this.input.keyboard?.on('keydown-UP', handleUp);
        this.input.keyboard?.on('keydown-DOWN', handleDown);
        this.input.keyboard?.on('keydown-SPACE', handleConfirm);
        this.input.keyboard?.on('keydown-A', handleConfirm);

        // 🚩 Touch Controls (via UIScene Registry)
        // Overwrite registry handlers so UIScene controls triggers OUR methods
        this.registry.set('input_up', handleUp);
        this.registry.set('input_down', handleDown);
        this.registry.set('input_confirm', handleConfirm);
        this.registry.set('input_cancel', handleCancel);
        // We don't use Left/Right but they exist in registry
        this.registry.set('input_left', () => { });
        this.registry.set('input_right', () => { });

        // Launch UIScene if not active (likely is)
        this.scene.launch('InterfaceScene');
        this.scene.bringToTop('InterfaceScene');
    }

    // private createTouchControls removed


    private navigateMenu(direction: number) {
        if (this.menuActions.length === 0) return;

        // Deseleccionar visual old
        this.highlightAction(this.selectedActionIndex, false);

        // Mover
        this.selectedActionIndex += direction;
        if (this.selectedActionIndex < 0) this.selectedActionIndex = this.menuActions.length - 1;
        if (this.selectedActionIndex >= this.menuActions.length) this.selectedActionIndex = 0;

        // Seleccionar visual new
        this.highlightAction(this.selectedActionIndex, true);
    }

    private executeMenuAction() {
        if (this.menuActions.length === 0) return;
        this.menuActions[this.selectedActionIndex].callback();
    }

    private highlightAction(index: number, isSelected: boolean) {
        if (this.menuButtons[index]) {
            this.menuButtons[index].setBackgroundColor(isSelected ? '#4a4a4a' : '#2a2a2a');
            this.menuButtons[index].setText(isSelected ? `> ${this.menuActions[index].text}` : this.menuActions[index].text);
        }
    }

    private createHPBars() {
        // Barra de HP del jugador
        const playerBarX = 50;
        const playerBarY = 400;

        this.add.rectangle(playerBarX, playerBarY, 150, 20, 0x333333)
            .setOrigin(0, 0.5);

        this.playerHPBar = this.add.graphics();

        this.add.text(playerBarX - 5, playerBarY - 25, 'JUGADOR', {
            fontSize: '16px',
            color: '#fff',
            fontStyle: 'bold'
        });

        // Barra de HP del enemigo
        const enemyBarX = 550;
        const enemyBarY = 250;

        this.add.rectangle(enemyBarX, enemyBarY, 150, 20, 0x333333)
            .setOrigin(0, 0.5);

        this.enemyHPBar = this.add.graphics();

        this.add.text(enemyBarX - 5, enemyBarY - 25, 'ENEMIGO', {
            fontSize: '16px',
            color: '#fff',
            fontStyle: 'bold'
        });

        this.updateHPBars();
    }

    private updateHPBars() {
        // Barra jugador
        this.playerHPBar.clear();
        const playerPercent = this.playerHP / this.playerMaxHP;
        const playerColor = playerPercent > 0.5 ? 0x00ff00 : (playerPercent > 0.25 ? 0xffaa00 : 0xff0000);
        this.playerHPBar.fillStyle(playerColor);
        this.playerHPBar.fillRect(50, 390, 150 * playerPercent, 20);

        // Barra enemigo
        this.enemyHPBar.clear();
        const enemyPercent = this.enemyHP / this.enemyMaxHP;
        const enemyColor = enemyPercent > 0.5 ? 0x00ff00 : (enemyPercent > 0.25 ? 0xffaa00 : 0xff0000);
        this.enemyHPBar.fillStyle(enemyColor);
        this.enemyHPBar.fillRect(550, 240, 150 * enemyPercent, 20);
    }

    private updateHPDisplay() {
        this.hpText.setText(
            `HP: ${this.playerHP}/${this.playerMaxHP}\n` +
            `Pociones: ${this.potions}`
        );
    }

    private updateMenu(message: string) {
        // Limpiar menú anterior
        this.menuButtons.forEach(btn => btn.destroy());
        this.menuButtons = [];
        this.menuActions = []; // Limpiar logica
        this.selectedActionIndex = 0;

        this.fightLog.setText(message);

        if (this.state === BattleState.PLAYER_TURN) {
            this.createMenuAction('⚔️ Ataque Normal', 150, 480, () => this.playerAttack(1.0, 'ataque normal'));
            this.createMenuAction('🔥 Ataque Fuego (x1.5)', 150, 510, () => this.playerAttack(1.5, 'ataque de fuego'));
            this.createMenuAction('💨 Ataque Rápido (x0.8)', 150, 540, () => this.playerAttack(0.8, 'ataque rápido'));
            this.createMenuAction('💊 Usar Poción', 150, 570, () => this.usePotion());

            // Highlight inicial
            this.highlightAction(0, true);
        }
    }

    private createMenuAction(text: string, x: number, y: number, callback: () => void) {
        const button = this.add.text(x, y, text, {
            backgroundColor: '#2a2a2a',
            padding: { x: 12, y: 8 },
            fontSize: '16px',
            color: '#fff'
        }); // Sin interactive pointer events

        this.menuButtons.push(button);
        this.menuActions.push({ text, callback });
    }

    private playerAttack(multiplier: number, attackName: string) {
        if (this.state !== BattleState.PLAYER_TURN) return;

        this.state = BattleState.ANIMATING;
        this.clearMenu();

        // Animación de ataque
        this.tweens.add({
            targets: this.playerSprite,
            x: 400,
            duration: 300,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                const baseDamage = 15;
                const variance = Phaser.Math.Between(-3, 3);
                const damage = Math.max(1, Math.round((baseDamage + variance) * multiplier));
                this.enemyHP = Math.max(0, this.enemyHP - damage);

                // Flash del enemigo
                this.tweens.add({
                    targets: this.enemySprite,
                    tint: 0xff0000,
                    duration: 100,
                    yoyo: true,
                    repeat: 2
                });

                this.updateHPBars();
                this.fightLog.setText(`¡Usaste ${attackName}! Hiciste ${damage} de daño.`);

                this.time.delayedCall(1500, () => {
                    if (this.checkBattleEnd()) return;
                    this.enemyTurn();
                });
            }
        });
    }

    private usePotion() {
        if (this.state !== BattleState.PLAYER_TURN) return;
        if (this.potions <= 0) {
            this.fightLog.setText('¡No tienes pociones!');
            return;
        }

        this.state = BattleState.ANIMATING;
        this.clearMenu();

        this.potions--;
        const healAmount = 30;
        this.playerHP = Math.min(this.playerMaxHP, this.playerHP + healAmount);

        // Efecto visual de curación
        const healText = this.add.text(this.playerSprite.x, this.playerSprite.y - 50, `+${healAmount}`, {
            fontSize: '24px',
            color: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: healText,
            y: healText.y - 30,
            alpha: 0,
            duration: 1000,
            onComplete: () => healText.destroy()
        });

        this.updateHPBars();
        this.updateHPDisplay();
        this.fightLog.setText(`Usaste una poción. Te curaste ${healAmount} HP.`);

        this.time.delayedCall(1500, () => {
            if (this.checkBattleEnd()) return;
            this.enemyTurn();
        });
    }

    private enemyTurn() {
        if (this.enemyHP <= 0) return;

        this.state = BattleState.ENEMY_TURN;

        // Animación de ataque enemigo
        this.tweens.add({
            targets: this.enemySprite,
            x: 400,
            duration: 300,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                const damage = Phaser.Math.Between(8, 15);
                this.playerHP = Math.max(0, this.playerHP - damage);

                // Flash del jugador
                this.tweens.add({
                    targets: this.playerSprite,
                    tint: 0xff0000,
                    duration: 100,
                    yoyo: true,
                    repeat: 2
                });

                // Shake de pantalla
                this.cameras.main.shake(200, 0.005);

                this.updateHPBars();
                this.updateHPDisplay();
                this.fightLog.setText(`¡El enemigo ataca! Te hace ${damage} de daño.`);

                this.time.delayedCall(1500, () => {
                    if (this.checkBattleEnd()) return;
                    this.state = BattleState.PLAYER_TURN;
                    this.updateMenu('¡Tu turno! Elige tu acción.');
                });
            }
        });
    }

    private checkBattleEnd(): boolean {
        if (this.enemyHP <= 0) {
            this.state = BattleState.WON;
            this.clearMenu();

            // 🚩 NUEVO: Marcar enemigo como derrotado si estamos en Valencia
            // 🚩 NUEVO: Marcar enemigo como derrotado si estamos en Valencia
            if (this.battleData.returnData.mapKey === 'valencia') {
                const gm = GameManager.getInstance();
                gm.valenciaEnemiesDefeated = true;

                // 🚩 NUEVO: Registrar enemigo específico como derrotado
                if (this.battleData.enemyId) {
                    gm.defeatedEnemies.push(this.battleData.enemyId);
                }

                // Drop de Corazón (si no tiene ya los 2)
                if (gm.heartsCollected < 2) {
                    gm.heartsCollected++;
                    const msg = gm.heartsCollected === 1
                        ? "Has conseguido media mitad de corazón."
                        : "Has conseguido media mitad de corazón. Ya tienes las dos mitades.";

                    this.fightLog.setText(`¡Victoria! ${msg}`);
                    // Pausa extra para leer
                    this.time.delayedCall(3000, () => {
                        this.returnToGame();
                    });
                    return true;
                }
            }

            // 🚩 NUEVO: Registrar cooldown también al ganar (petición de usuario: inactivo 30s)
            GameManager.getInstance().lastBattleTime = Date.now();

            // ... (Animación de victoria se mantiene)

            this.fightLog.setText('¡Victoria! Has derrotado al enemigo.');

            this.time.delayedCall(2000, () => {
                this.returnToGame();
            });
            return true;
        } else if (this.playerHP <= 0) {
            this.state = BattleState.LOST;
            this.clearMenu();

            // 🚩 NUEVO: Registrar el tiempo de la derrota para el cooldown
            GameManager.getInstance().lastBattleTime = Date.now();

            // ... (Animación de derrota se mantiene)

            this.time.delayedCall(2000, () => {
                this.playerHP = this.playerMaxHP; // Restaurar HP
                this.potions = 2; // Restaurar pociones
                this.returnToGame();
            });
            return true;
        }
        return false;
    }

    private returnToGame() {
        this.cameras.main.fadeOut(500);
        this.time.delayedCall(500, () => {
            this.scene.stop();
            this.scene.resume(this.battleData.returnScene, this.battleData.returnData);
        });
    }

    private clearMenu() {
        this.menuButtons.forEach(btn => btn.destroy());
        this.menuButtons = [];
    }
}