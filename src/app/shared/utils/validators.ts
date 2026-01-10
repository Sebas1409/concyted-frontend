export class CustomValidators {
    static get emailPattern(): RegExp {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    }

    static get numberPattern(): RegExp {
        return /^[0-9]+$/;
    }

    static get codePattern(): RegExp {
        return /^[0-9]{6}$/;
    }

    static hasUpperCase(str: string | null | undefined): boolean {
        return str ? /[A-Z]/.test(str) : false;
    }

    static hasNumber(str: string | null | undefined): boolean {
        return str ? /[0-9]/.test(str) : false;
    }

    static checkPasswords(group: any) {
        const pass = group.get('password')?.value;
        const confirmPass = group.get('confirmPassword')?.value;
        return pass === confirmPass ? null : { notSame: true };
    }
}
