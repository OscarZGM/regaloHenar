// src/main.ts

import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { PuzzleScene } from './scenes/PuzzleScene';
import { BattleScene } from './scenes/BattleScene';

// Configuración general de Phaser
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800, // 25 tiles * 32px
    height: 600, // 18.75 tiles * 32px
    parent: 'game-container',
    // Añade todas las escenas a la lista
    scene: [GameScene, PuzzleScene, BattleScene], 
    physics: {
        default: 'arcade',
        arcade: {
             // debug: true // Descomentar para ver las cajas de colisión
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

new Phaser.Game(config);