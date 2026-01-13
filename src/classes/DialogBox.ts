// src/classes/DialogBox.ts

import Phaser from 'phaser';

export class DialogBox {
    private scene: Phaser.Scene;
    private box!: Phaser.GameObjects.Rectangle;
    private text!: Phaser.GameObjects.Text;
    private visible: boolean = false;
    private callback?: () => void;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createBox();
    }

    private createBox() {
        const width = 700;
        const height = 150;
        const x = 400;
        const y = 500;

        // Fondo del diálogo
        this.box = this.scene.add.rectangle(x, y, width, height, 0x000000, 0.8)
            .setScrollFactor(0)
            .setDepth(1000)
            .setVisible(false)
            .setStrokeStyle(3, 0xffffff);

        // Texto del diálogo
        this.text = this.scene.add.text(x, y, '', {
            fontSize: '18px',
            color: '#ffffff',
            align: 'left',
            wordWrap: { width: width - 40 }
        })
            .setScrollFactor(0)
            .setDepth(1001)
            .setOrigin(0.5, 0.5)
            .setVisible(false);
    }

    // ❌ ELIMINADO: setupInput() interno. Ahora el control es externo.
    // private setupInput() { ... }

    public handleConfirm() {
        if (!this.visible) return;

        if (this.callback) {
            this.callback();
        }
        this.hide();
    }

    public show(message: string, callback?: () => void) {
        this.text.setText(message);
        this.box.setVisible(true);
        this.text.setVisible(true);
        this.visible = true;
        this.callback = callback;
    }

    public hide() {
        this.box.setVisible(false);
        this.text.setVisible(false);
        this.visible = false;
        if (this.callback && !this.scene.input.keyboard?.checkDown(this.scene.input.keyboard.addKey('ENTER'), 0)) {
            // Solo ejecutar callback si no se presionó ENTER
        }
        this.callback = undefined;
    }

    public isVisible(): boolean {
        return this.visible;
    }

    public destroy() {
        this.box.destroy();
        this.text.destroy();
    }
}