// src/scenes/PuzzleScene.ts
import Phaser from 'phaser';
import { GameManager } from '../classes/GameManager';

interface PuzzleData {
    location: string;
    digit: number;
    type: 'Cajas' | 'Interruptores' | 'Preguntas';
}

export class PuzzleScene extends Phaser.Scene {
    private gm: GameManager = GameManager.getInstance();
    private puzzleData!: PuzzleData;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    
    // Puzzle de Cajas (Sokoban)
    private playerPos!: { x: number, y: number };
    private boxes!: { x: number, y: number }[];
    private targets!: { x: number, y: number }[];
    private walls!: { x: number, y: number }[];
    private grid: any[][] = [];
    private tileSize: number = 40;
    private moveCount: number = 0;
    private moveText!: Phaser.GameObjects.Text;
    
    // Puzzle de Interruptores
    private switches!: { id: number, on: boolean, sprite: Phaser.GameObjects.Rectangle }[];
    private correctSequence: number[] = [2, 1, 3];
    private currentSequence: number[] = [];
    
    // Puzzle de Preguntas
    private inputElement!: HTMLInputElement;

    constructor() {
        super('PuzzleScene');
    }

    init(data: PuzzleData) {
        this.puzzleData = data;
    }

    create() {
        this.add.rectangle(400, 300, 800, 600, 0x87CEEB);
        
        this.add.text(400, 30, `Misión: ${this.puzzleData.location}`, { 
            fontSize: '32px',
            color: '#000',
            fontStyle: 'bold',
            stroke: '#fff',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        this.add.text(400, 70, `Puzzle: ${this.puzzleData.type}`, { 
            fontSize: '24px',
            color: '#333'
        }).setOrigin(0.5);
        
        // Crear el puzzle específico
        if (this.puzzleData.type === 'Cajas') {
            this.createSokobanPuzzle();
        } else if (this.puzzleData.type === 'Interruptores') {
            this.createSwitchPuzzle();
        } else if (this.puzzleData.type === 'Preguntas') {
            this.createQuestionPuzzle();
        }
        
        // Botón de regreso
        const backBtn = this.add.text(50, 550, '← Volver', {
            backgroundColor: '#ff5555',
            padding: { x: 15, y: 10 },
            fontSize: '18px'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.returnToGame());
    }

    private createSokobanPuzzle() {
        // Nivel simple de Sokoban
        const level = [
            [1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 2, 0, 3, 0, 1],
            [1, 0, 0, 4, 0, 0, 1],
            [1, 0, 3, 0, 2, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1]
        ];
        // 0 = suelo, 1 = pared, 2 = objetivo, 3 = caja, 4 = jugador
        
        this.boxes = [];
        this.targets = [];
        this.walls = [];
        this.grid = level;
        
        const offsetX = 250;
        const offsetY = 150;
        
        for (let y = 0; y < level.length; y++) {
            for (let x = 0; x < level[y].length; x++) {
                const worldX = offsetX + x * this.tileSize;
                const worldY = offsetY + y * this.tileSize;
                
                // Dibujar suelo
                if (level[y][x] !== 1) {
                    this.add.rectangle(worldX, worldY, this.tileSize, this.tileSize, 0xcccccc)
                        .setStrokeStyle(1, 0x999999);
                }
                
                if (level[y][x] === 1) {
                    // Pared
                    this.walls.push({ x, y });
                    this.add.rectangle(worldX, worldY, this.tileSize, this.tileSize, 0x654321);
                } else if (level[y][x] === 2) {
                    // Objetivo
                    this.targets.push({ x, y });
                    this.add.circle(worldX, worldY, this.tileSize / 3, 0x00ff00, 0.3)
                        .setStrokeStyle(2, 0x00aa00);
                } else if (level[y][x] === 3) {
                    // Caja
                    this.boxes.push({ x, y });
                } else if (level[y][x] === 4) {
                    // Jugador
                    this.playerPos = { x, y };
                }
            }
        }
        
        // Dibujar cajas y jugador
        this.renderSokoban();
        
        // Controles
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Contador de movimientos
        this.moveText = this.add.text(400, 500, `Movimientos: ${this.moveCount}`, {
            fontSize: '20px',
            color: '#000'
        }).setOrigin(0.5);
        
        // Instrucciones
        this.add.text(400, 110, 'Empuja todas las cajas (marrón) a los objetivos (verde)', {
            fontSize: '16px',
            color: '#333',
            align: 'center'
        }).setOrigin(0.5);
    }

    private renderSokoban() {
        const offsetX = 250;
        const offsetY = 150;
        
        // Limpiar sprites anteriores
        this.children.list.forEach(child => {
            if (child.getData('sokoban')) {
                child.destroy();
            }
        });
        
        // Dibujar cajas
        this.boxes.forEach(box => {
            const worldX = offsetX + box.x * this.tileSize;
            const worldY = offsetY + box.y * this.tileSize;
            const isOnTarget = this.targets.some(t => t.x === box.x && t.y === box.y);
            
            this.add.rectangle(worldX, worldY, this.tileSize * 0.8, this.tileSize * 0.8, 
                isOnTarget ? 0x00cc00 : 0x8B4513)
                .setData('sokoban', true);
        });
        
        // Dibujar jugador
        const worldX = offsetX + this.playerPos.x * this.tileSize;
        const worldY = offsetY + this.playerPos.y * this.tileSize;
        this.add.circle(worldX, worldY, this.tileSize / 3, 0x0000ff)
            .setData('sokoban', true);
    }

    update() {
        if (this.puzzleData.type === 'Cajas' && this.cursors) {
            this.handleSokobanInput();
        }
    }

    private handleSokobanInput() {
        const justPressed = Phaser.Input.Keyboard.JustDown;
        
        let dx = 0, dy = 0;
        
        if (justPressed(this.cursors.up!)) dy = -1;
        else if (justPressed(this.cursors.down!)) dy = 1;
        else if (justPressed(this.cursors.left!)) dx = -1;
        else if (justPressed(this.cursors.right!)) dx = 1;
        
        if (dx !== 0 || dy !== 0) {
            this.moveSokoban(dx, dy);
        }
    }

    private moveSokoban(dx: number, dy: number) {
        const newX = this.playerPos.x + dx;
        const newY = this.playerPos.y + dy;
        
        // Verificar si hay pared
        if (this.walls.some(w => w.x === newX && w.y === newY)) {
            return;
        }
        
        // Verificar si hay caja
        const boxIndex = this.boxes.findIndex(b => b.x === newX && b.y === newY);
        
        if (boxIndex !== -1) {
            // Intentar empujar la caja
            const newBoxX = newX + dx;
            const newBoxY = newY + dy;
            
            // Verificar si la posición de la caja es válida
            if (this.walls.some(w => w.x === newBoxX && w.y === newBoxY) ||
                this.boxes.some(b => b.x === newBoxX && b.y === newBoxY)) {
                return; // No se puede empujar
            }
            
            // Empujar la caja
            this.boxes[boxIndex].x = newBoxX;
            this.boxes[boxIndex].y = newBoxY;
        }
        
        // Mover jugador
        this.playerPos.x = newX;
        this.playerPos.y = newY;
        this.moveCount++;
        
        this.moveText.setText(`Movimientos: ${this.moveCount}`);
        this.renderSokoban();
        
        // Verificar si se completó el puzzle
        this.checkSokobanWin();
    }

    private checkSokobanWin() {
        const allBoxesOnTargets = this.targets.every(target =>
            this.boxes.some(box => box.x === target.x && box.y === target.y)
        );
        
        if (allBoxesOnTargets) {
            this.time.delayedCall(500, () => {
                this.onPuzzleSolved();
            });
        }
    }

    private createSwitchPuzzle() {
        this.switches = [];
        this.currentSequence = [];
        
        const instruction = this.add.text(400, 120, 
            'Activa los interruptores en el orden correcto:\n' +
            'Pista: El orden es MEDIO, IZQUIERDA, DERECHA',
            {
                fontSize: '18px',
                color: '#000',
                align: 'center'
            }
        ).setOrigin(0.5);
        
        const positions = [
            { id: 1, x: 250, y: 300, label: 'IZQUIERDA' },
            { id: 2, x: 400, y: 300, label: 'MEDIO' },
            { id: 3, x: 550, y: 300, label: 'DERECHA' }
        ];
        
        positions.forEach(pos => {
            const switchRect = this.add.rectangle(pos.x, pos.y, 80, 120, 0xaaaaaa)
                .setStrokeStyle(3, 0x000000)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.toggleSwitch(pos.id));
            
            this.add.text(pos.x, pos.y + 80, pos.label, {
                fontSize: '14px',
                color: '#000'
            }).setOrigin(0.5);
            
            this.switches.push({ id: pos.id, on: false, sprite: switchRect });
        });
        
        this.add.text(400, 450, 'Secuencia actual: Ninguna', {
            fontSize: '18px',
            color: '#000'
        }).setOrigin(0.5).setName('sequenceText');
    }

    private toggleSwitch(id: number) {
        const sw = this.switches.find(s => s.id === id);
        if (!sw) return;
        
        if (!sw.on) {
            sw.on = true;
            sw.sprite.setFillStyle(0x00ff00);
            this.currentSequence.push(id);
            
            const seqText = this.children.getByName('sequenceText') as Phaser.GameObjects.Text;
            seqText.setText(`Secuencia actual: ${this.currentSequence.join(' → ')}`);
            
            if (this.currentSequence.length === 3) {
                this.checkSwitchSequence();
            }
        }
    }

    private checkSwitchSequence() {
        const correct = this.currentSequence.every((val, idx) => val === this.correctSequence[idx]);
        
        this.time.delayedCall(500, () => {
            if (correct) {
                this.onPuzzleSolved();
            } else {
                // Resetear
                this.switches.forEach(sw => {
                    sw.on = false;
                    sw.sprite.setFillStyle(0xaaaaaa);
                });
                this.currentSequence = [];
                
                const seqText = this.children.getByName('sequenceText') as Phaser.GameObjects.Text;
                seqText.setText('¡Incorrecto! Intenta de nuevo...');
                
                this.cameras.main.shake(300, 0.01);
            }
        });
    }

    private createQuestionPuzzle() {
        const questions: { [key: string]: { question: string, answer: string } } = {
            'Japon': {
                question: '¿Qué flor te regalé en nuestro primer San Valentín?',
                answer: 'rosa'
            },
            'Valencia': {
                question: '¿En qué mes nos conocimos?',
                answer: 'febrero'
            },
            'Valladolid': {
                question: '¿Cuál es tu color favorito?',
                answer: 'azul'
            }
        };
        
        const qa = questions[this.puzzleData.location] || questions['Japon'];
        
        this.add.text(400, 180, qa.question, {
            fontSize: '24px',
            color: '#000',
            align: 'center',
            wordWrap: { width: 600 }
        }).setOrigin(0.5);
        
        // En createQuestionPuzzle()
        this.inputElement.style.border = '4px solid #a38c71'; // Borde estilo madera
        this.inputElement.style.borderRadius = '8px';
        this.inputElement.style.backgroundColor = '#f7f3e8';
        this.inputElement.style.color = '#5c4b37';
        this.inputElement.style.fontFamily = 'Arial, sans-serif';
        this.inputElement.style.textAlign = 'center';
        this.inputElement.style.outline = 'none';
        // Crear input HTML
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.style.position = 'absolute';
        this.inputElement.style.left = '300px';
        this.inputElement.style.top = '300px';
        this.inputElement.style.width = '200px';
        this.inputElement.style.height = '30px';
        this.inputElement.style.fontSize = '18px';
        this.inputElement.style.padding = '5px';
        document.body.appendChild(this.inputElement);
        
        const submitBtn = this.add.text(400, 380, 'RESPONDER', {
            backgroundColor: '#4CAF50',
            padding: { x: 20, y: 10 },
            fontSize: '20px'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            const answer = this.inputElement.value.toLowerCase().trim();
            if (answer === qa.answer.toLowerCase()) {
                document.body.removeChild(this.inputElement);
                this.onPuzzleSolved();
            } else {
                this.cameras.main.shake(300, 0.01);
                this.add.text(400, 430, '¡Respuesta incorrecta!', {
                    fontSize: '18px',
                    color: '#ff0000'
                }).setOrigin(0.5);
            }
        });
    }

    private onPuzzleSolved() {
        // Almacenar el dígito encontrado
        const digit = this.puzzleData.digit;
        if (this.puzzleData.location === 'Valencia') {
            this.gm.cluesFound.valencia = digit;
        } else if (this.puzzleData.location === 'Valladolid') {
            this.gm.cluesFound.valladolid = digit;
        } else if (this.puzzleData.location === 'Japon') {
            this.gm.cluesFound.japon = digit;
        }
        
        // Mostrar celebración
        const congrats = this.add.text(400, 300, `¡RESUELTO!\n\nDígito encontrado: ${digit}`, {
            fontSize: '36px',
            color: '#FFD700',
            align: 'center',
            backgroundColor: '#000000cc',
            padding: { x: 30, y: 20 },
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100);
        
        this.tweens.add({
            targets: congrats,
            scale: { from: 0, to: 1 },
            duration: 500,
            ease: 'Back.out'
        });
        
        this.time.delayedCall(3000, () => {
            this.returnToGame();
        });
    }

    private returnToGame() {
        if (this.inputElement && document.body.contains(this.inputElement)) {
            document.body.removeChild(this.inputElement);
        }
        
        this.cameras.main.fadeOut(500);
        this.time.delayedCall(500, () => {
            this.scene.start('GameScene', { mapKey: 'house' });
        });
    }
}