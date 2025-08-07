export interface User {
    email: string;
    apiKey: string;
    createdAt: string;
    plan: 'free' | 'paid';
}
