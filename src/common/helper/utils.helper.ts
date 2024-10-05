export class Utils {

    static randomNumber(min, max) { // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min).toFixed(0);
    }

    static generateToken(length: number = 5) { // min and max included
        return Utils.randomNumber(10 ** (length - 1), 10 ** (length) - 1)
    }

    static getFileExtension(filename: string): any {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    }
}