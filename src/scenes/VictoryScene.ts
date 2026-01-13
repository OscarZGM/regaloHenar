// src/scenes/VictoryScene.ts
import Phaser from 'phaser';

export class VictoryScene extends Phaser.Scene {
    constructor() {
        super('VictoryScene');
    }

    create() {
        // Fondo festivo
        this.add.rectangle(400, 300, 800, 600, 0xFF69B4); // Rosa cozy
        
        // Texto Emotivo
        this.add.text(400, 200, '¡FELIZ CUMPLEAÑOS!', {
            fontSize: '64px',
            color: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(400, 300, 'Gracias por jugar a nuestra historia.\nTe quiero mucho.', {
            fontSize: '32px',
            color: '#fff',
            align: 'center',
            wordWrap: { width: 600 }
        }).setOrigin(0.5);

        // Partículas (Confeti simple)
        const particles = this.add.particles(0, 0, 'box', { // Usamos 'box' como partícula improvisada
            x: 400,
            y: 300,
            speed: 200,
            lifespan: 2000,
            blendMode: 'ADD',
            scale: { start: 0.2, end: 0 },
            tint: [ 0xff0000, 0x00ff00, 0x0000ff, 0xffff00 ]
        });
    }
}