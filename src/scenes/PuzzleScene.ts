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

    constructor() {
        super('PuzzleScene');
    }

    // Recibe los datos específicos del rompecabezas a cargar
    init(data: PuzzleData) {
        this.puzzleData = data;
    }

    create() {
        this.add.text(400, 50, `Misión: ${this.puzzleData.location}`, { fontSize: '32px', color: '#000' }).setOrigin(0.5);
        this.add.text(400, 100, `Tipo: ${this.puzzleData.type}`, { fontSize: '24px', color: '#000' }).setOrigin(0.5);
        
        // --- Lógica de Rompecabezas (Visualización y Mecánica) ---
        let instruction = '';
        if (this.puzzleData.type === 'Cajas') {
            instruction = 'Rompecabezas de Sokoban: Empuja la(s) caja(s) a la zona objetivo para revelar el dígito.';
            // Aquí se generaría la cuadrícula de cajas.
        } else if (this.puzzleData.type === 'Interruptores') {
            instruction = 'Rompecabezas de Interruptores: Activa los 3 interruptores en el orden correcto para abrir la bóveda del dígito.';
            // Aquí se generarían los botones/interruptores interactivos.
        } else if (this.puzzleData.type === 'Preguntas') {
            instruction = 'Rompecabezas de Preguntas Personales: Responde la pregunta clave sobre nosotros.';
            // Aquí se generaría un campo de entrada de texto (HTML input o Phaser Input).
            this.createQuestionUI();
        }
        
        this.add.text(50, 200, instruction, { wordWrap: { width: 700 } });

        // --- Botón de Retorno/Simulación de Éxito ---
        const solveButton = this.add.text(400, 500, 'SIMULAR RESOLUCIÓN Y OBTENER CLAVE', { 
            backgroundColor: '#FFD700', padding: { x: 10, y: 10 }, color: '#000' 
        }).setOrigin(0.5).setInteractive();
        
        solveButton.on('pointerdown', () => this.onPuzzleSolved());
    }

    private createQuestionUI() {
        const question = this.puzzleData.location === 'Japon' 
            ? "¿Cuál es el nombre de la flor que me regalaste en nuestro primer San Valentín?"
            : "Pregunta de Relleno...";
        
        this.add.text(100, 300, question, { color: '#000' });
        
        // En una implementación real, usarías un campo de entrada de texto aquí.
    }

    private onPuzzleSolved() {
        // Almacenar la clave en el GameManager basada en la ubicación
        const digit = this.puzzleData.digit;
        if (this.puzzleData.location === 'Valencia') {
            this.gm.cluesFound.valencia = digit; 
        } else if (this.puzzleData.location === 'Valladolid') {
            this.gm.cluesFound.valladolid = digit; 
        } else if (this.puzzleData.location === 'Japon') {
            this.gm.cluesFound.japon = digit; 
        }
        
        alert(`¡Clave ${this.puzzleData.location} encontrada: ${digit}! Regresando a la casa.`);
        this.scene.start('GameScene'); // Vuelve a la escena principal
    }
}