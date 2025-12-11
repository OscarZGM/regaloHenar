// src/scenes/BattleScene.ts
import Phaser from 'phaser';

enum BattleState {
    START,
    PLAYER_TURN,
    ENEMY_TURN,
    WON,
    LOST
}

export class BattleScene extends Phaser.Scene {
    private state: BattleState = BattleState.START;
    private playerHP: number = 100;
    private enemyHP: number = 50;
    private hpText!: Phaser.GameObjects.Text;
    private fightLog!: Phaser.GameObjects.Text;

    constructor() {
        super('BattleScene');
    }

    create() {
        this.state = BattleState.START;
        
        // --- Interfaz y Fondo ---
        this.add.rectangle(400, 300, 800, 600, 0x88AAFF); // Fondo azul
        this.add.text(400, 50, '¡Encuentro de Combate!', { fontSize: '40px' }).setOrigin(0.5);
        
        // --- Sprites (Jugador y Enemigo) ---
        this.add.image(150, 400, 'player_placeholder').setScale(2);
        this.add.image(650, 400, 'enemy_placeholder').setScale(2);
        
        // --- Log y Estado ---
        this.hpText = this.add.text(50, 50, `Player HP: ${this.playerHP}\nEnemy HP: ${this.enemyHP}`, { color: '#FFFFFF' });
        this.fightLog = this.add.text(100, 500, 'Iniciando...', { fontSize: '20px', color: '#FFD700' });

        this.time.delayedCall(1500, () => {
            this.state = BattleState.PLAYER_TURN;
            this.updateMenu('Elige una acción.');
        });
    }

    private updateMenu(message: string) {
        // Limpia el menú y actualiza el log
        this.children.getAll().filter(child => child.name === 'menuItem').forEach(child => child.destroy());
        this.fightLog.setText(message);
        
        if (this.state === BattleState.PLAYER_TURN) {
            this.createMenuButton('Ataque', 100, 550, () => this.playerAttack());
            this.createMenuButton('Habilidad (Fuego)', 250, 550, () => this.playerAttack(1.5));
            this.createMenuButton('Objeto (Curación)', 450, 550, () => this.playerHeal());
        }
    }
    
    private createMenuButton(text: string, x: number, y: number, callback: () => void) {
        // Se corrige el padding para evitar el error TS2559
        const button = this.add.text(x, y, text, { backgroundColor: '#333333', padding: { x: 8, y: 8 } })
            .setInteractive()
            .setName('menuItem')
            .on('pointerdown', callback);
    }
    
    // --- Lógica de Combate ---
    private playerAttack(multiplier: number = 1.0) {
        this.state = BattleState.ENEMY_TURN; 
        
        const baseDamage = 15;
        const damage = Math.round(baseDamage * multiplier);
        this.enemyHP -= damage;
        
        this.updateMenu(`¡Atacas! Haces ${damage} de daño.`);
        
        this.time.delayedCall(1500, () => {
            if (!this.checkBattleEnd()) {
                this.enemyTurn();
            }
        });
    }

    private playerHeal() {
        this.state = BattleState.ENEMY_TURN;
        const healAmount = 25;
        this.playerHP = Math.min(100, this.playerHP + healAmount);
        
        this.updateMenu(`Usas un objeto. Te curas ${healAmount} de HP.`);
        
        this.time.delayedCall(1500, () => {
            if (!this.checkBattleEnd()) {
                this.enemyTurn();
            }
        });
    }

    private enemyTurn() {
        if (this.enemyHP <= 0) return; 

        const damage = 10;
        this.playerHP -= damage;
        
        this.updateMenu(`El enemigo te ataca y te hace ${damage} de daño.`);
        
        this.time.delayedCall(1500, () => {
            if (!this.checkBattleEnd()) {
                this.state = BattleState.PLAYER_TURN;
                this.updateMenu('Elige tu siguiente acción.');
            }
        });
    }

    private checkBattleEnd(): boolean {
        this.hpText.setText(`Player HP: ${this.playerHP}\nEnemy HP: ${this.enemyHP}`);

        if (this.enemyHP <= 0) {
            this.state = BattleState.WON;
            alert('¡Victoria! Regresas a la Casa.');
            this.scene.start('GameScene');
            return true;
        } else if (this.playerHP <= 0) {
            this.state = BattleState.LOST;
            alert('Has perdido. Regresas a la Casa.');
            this.scene.start('GameScene');
            return true;
        }
        return false;
    }
}