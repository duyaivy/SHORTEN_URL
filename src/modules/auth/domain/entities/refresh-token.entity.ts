export class RefreshToken {
    constructor(
        public readonly id: string,
        public readonly tokenHash: string,
        public readonly userId: string,
        public readonly expiresAt: Date,
        public readonly createdAt: Date,
    ) { }
}
