// src/classes/GameManager.ts

export class GameManager {
    private static instance: GameManager;

    public cluesFound: { valencia: number | null, valladolid: number | null, japon: number | null };
    public readonly correctCode: string = "206";

    // 🚩 NUEVO: Almacena el estado de los enemigos
    public valenciaEnemiesDefeated: boolean = false;
    public lastBattleTime: number = 0;

    // 🚩 NUEVO: Estados para las misiones de los dígitos
    public heartsCollected: number = 0;
    public hasCombinedHearts: boolean = false;
    public yenCount: number = 0;
    public hasCola: boolean = false;
    public quizCompleted: boolean = false;

    // 🚩 NUEVO: Arrays de persistencia por ID
    public collectedYens: number[] = [];
    public defeatedEnemies: string[] = [];

    private constructor() {
        this.cluesFound = {
            valencia: null,
            valladolid: null,
            japon: null
        };
    }

    // Método estático para obtener la única instancia del GameManager
    public static getInstance(): GameManager {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }

    // Muestra cuántos dígitos se han recolectado
    public getStatus(): string {
        let count = 0;
        if (this.cluesFound.valencia !== null) count++;
        if (this.cluesFound.valladolid !== null) count++;
        if (this.cluesFound.japon !== null) count++;
        return `Dígitos encontrados: ${count} de 3.`;
    }

    // Verifica si los tres dígitos se han encontrado y están en el orden 206
    public checkCode(): boolean {
        if (this.cluesFound.valencia !== null && this.cluesFound.valladolid !== null && this.cluesFound.japon !== null) {
            const currentCode =
                `${this.cluesFound.valencia}` +
                `${this.cluesFound.valladolid}` +
                `${this.cluesFound.japon}`;
            return currentCode === this.correctCode;
        }
        return false;
    }
}