export class User {
    constructor(
        public readonly _id: string,
        public readonly username: string,
        public readonly email: string,
        public readonly password: string,
        public readonly created_at: Date,
        public readonly updated_at: Date,
        public readonly avatar_url?: string,
    ) { }
    
}
