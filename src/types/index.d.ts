export interface User {
    email: string;
    apiKey: string;
    createdAt: string;
    plan: 'free' | 'paid';
}

export interface EncodriveFile {
    userEmail: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    s3Url: string;
    uploadedAt: string;
}
