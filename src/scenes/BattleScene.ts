// src/scenes/BattleScene.ts
import Phaser from 'phaser';

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
    private menuButtons: Phaser.GameObjects.Text[] = [];
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
        this.fightLog.setText(message);
        
        if (this.state === BattleState.PLAYER_TURN) {
            this.createMenuButton('⚔️ Ataque Normal', 150, 530, () => this.playerAttack(1.0, 'ataque normal'));
            this.createMenuButton('🔥 Ataque Fuego (x1.5)', 350, 530, () => this.playerAttack(1.5, 'ataque de fuego'));
            this.createMenuButton('💨 Ataque Rápido (x0.8)', 150, 560, () => this.playerAttack(0.8, 'ataque rápido'));
            this.createMenuButton('💊 Usar Poción', 350, 560, () => this.usePotion());
        }
    }
    
    private createMenuButton(text: string, x: number, y: number, callback: () => void) {
        const button = this.add.text(x, y, text, { 
            backgroundColor: '#2a2a2a',
            padding: { x: 12, y: 8 },
            fontSize: '16px',
            color: '#fff'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => button.setBackgroundColor('#4a4a4a'))
        .on('pointerout', () => button.setBackgroundColor('#2a2a2a'))
        .on('pointerdown', callback);
        
        this.menuButtons.push(button);
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
            
            // Animación de victoria
            this.tweens.add({
                targets: this.enemySprite,
                alpha: 0,
                y: this.enemySprite.y + 50,
                duration: 500
            });
            
            this.fightLog.setText('¡Victoria! Has derrotado al enemigo.');
            
            this.time.delayedCall(2000, () => {
                this.returnToGame();
            });
            return true;
        } else if (this.playerHP <= 0) {
            this.state = BattleState.LOST;
            this.clearMenu();
            
            // Animación de derrota
            this.cameras.main.shake(500, 0.01);
            this.fightLog.setText('Has sido derrotado...');
            
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