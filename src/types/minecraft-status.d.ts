declare module 'minecraft-status' {
    export class MinecraftServerListPing {
        static ping(protocol: number, host: string, port: number, timeout: number): Promise<{
            version?: {
                name?: string;
                protocol?: number;
            };
            players?: {
                max?: number;
                online?: number;
                sample?: Array<{
                    name: string;
                    id: string;
                }>;
            };
            description?: {
                text?: string;
            } | string;
            favicon?: string;
        }>;
        
        static ping16(protocol: number, host: string, port: number, timeout: number): Promise<any>;
        static ping15(host: string, port: number, timeout: number): Promise<any>;
        static ping13(host: string, port: number, timeout: number): Promise<any>;
    }
    
    export class MinecraftQuery {
        static query(host: string, port: number, timeout: number): Promise<any>;
        static fullQuery(host: string, port: number, timeout: number): Promise<any>;
    }
}
