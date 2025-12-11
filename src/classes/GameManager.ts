// src/classes/GameManager.ts

export class GameManager {
    private static instance: GameManager;
    
    // Almacena los dígitos encontrados (null si no se han encontrado)
    public cluesFound: { valencia: number | null, valladolid: number | null, japon: number | null };
    public readonly correctCode: string = "206";

    private constructor() {
        // Los dígitos correctos son 2, 0, 6 en el orden Valencia, Valladolid, Japón.
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