import Phaser from 'phaser';
import { DialogBox } from '../classes/DialogBox';

export class InterfaceScene extends Phaser.Scene {
    private dialogBox!: DialogBox;
    private scoreText!: Phaser.GameObjects.Text;

    // Control flags for continuous movement
    private btnUp!: Phaser.GameObjects.Shape;
    private btnDown!: Phaser.GameObjects.Shape;
    private btnLeft!: Phaser.GameObjects.Shape;
    private btnRight!: Phaser.GameObjects.Shape;


    constructor() {
        super({ key: 'InterfaceScene', active: true });
    }

    create() {
        this.dialogBox = new DialogBox(this);
        this.createHUD();
        this.createTouchControls();

        // Ensure flags are false initially
        this.registry.set('virtual_cursor_up', false);
        this.registry.set('virtual_cursor_down', false);
        this.registry.set('virtual_cursor_left', false);
        this.registry.set('virtual_cursor_right', false);
    }

    // --- HUD ---
    private createHUD() {
        this.scoreText = this.add.text(16, 16, '', {
            fontSize: '16px',
            color: '#fff',
            fontStyle: 'bold',
            padding: { x: 5, y: 5 },
            backgroundColor: '#00000044' // Semi-transparent bg for readability
        }).setScrollFactor(0).setDepth(100);
    }

    public updateHUD(text: string) {
        if (this.scoreText) {
            this.scoreText.setText(text);
        }
    }

    // --- Dialog Proxy ---
    public showDialog(message: string, callback?: () => void) {
        this.dialogBox.show(message, callback);
    }

    public isDialogVisible(): boolean {
        return this.dialogBox ? this.dialogBox.isVisible() : false;
    }

    public handleDialogConfirm() {
        if (this.dialogBox) {
            this.dialogBox.handleConfirm();
        }
    }

    // --- Touch Controls ---
    private createTouchControls() {
        const width = this.sys.game.canvas.width;
        const height = this.sys.game.canvas.height;
        const btnSize = 60;
        const padX = 80;
        const padY = height - 80;
        const spacing = 70;

        // Helper to create buttons
        const createBtn = (x: number, y: number, text: string, dirKey: string, inputEvent: string) => {
            const btn = this.add.circle(x, y, btnSize / 2, 0xffffff, 0.3)
                .setDepth(200)
                .setInteractive()
                .setScrollFactor(0);

            const label = this.add.text(x, y, text, { fontSize: '24px', color: '#000' })
                .setOrigin(0.5)
                .setDepth(201)
                .setScrollFactor(0);

            // Pointer Events
            btn.on('pointerdown', () => {
                btn.setFillStyle(0xffffff, 0.6);
                if (dirKey) this.registry.set(dirKey, true);

                // Trigger discrete input event (for menus)
                const callback = this.registry.get(inputEvent);
                if (callback) callback();
            });

            const release = () => {
                btn.setFillStyle(0xffffff, 0.3);
                if (dirKey) this.registry.set(dirKey, false);
            };

            btn.on('pointerup', release);
            btn.on('pointerout', release);

            return btn;
        };

        // D-Pad
        // Up
        this.btnUp = createBtn(padX, padY - spacing, '▲', 'virtual_cursor_up', 'input_up');
        // Down
        this.btnDown = createBtn(padX, padY + spacing, '▼', 'virtual_cursor_down', 'input_down');
        // Left
        this.btnLeft = createBtn(padX - spacing, padY, '◄', 'virtual_cursor_left', 'input_left'); // Usually menu doesn't use left/right, but map does
        // Right
        this.btnRight = createBtn(padX + spacing, padY, '►', 'virtual_cursor_right', 'input_right');

        // Action Buttons
        const actionX = width - 80;
        const actionY = height - 80;

        // A Button (Confirm/Interact)
        createBtn(actionX, actionY - 40, 'A', '', 'input_confirm')
            .setFillStyle(0xffff00, 0.3) // Yellow tint
            .on('pointerdown', () => {
                // Specific behavior for Confirm button visual
            });

        // B Button (Cancel/Back)
        createBtn(actionX - spacing, actionY, 'B', '', 'input_cancel')
            .setFillStyle(0xff0000, 0.3) // Red tint
            .on('pointerdown', () => { /* Visual */ });
    }
}
