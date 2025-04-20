import { MinecraftServerListPing } from 'minecraft-status';

export async function fetchMinecraftPlayers(host: string, port: number, timeout = 5000): Promise<any> {
    console.log(`Fetching players from Minecraft server at ${host}:${port} with timeout ${timeout}ms`);

    try {
        const response = await MinecraftServerListPing.ping(4, host, port, timeout);

        console.log(`Successfully received response from ${host}:${port}`);
        console.log(`Server version: ${response.version?.name || 'Unknown'}`);
        console.log(`Players online: ${response.players?.online || 0}/${response.players?.max || 0}`);

        if (response.players?.sample) {
            console.log(`Found ${response.players.sample.length} players in server response`);
        } else {
            console.log('Server is online but no players found in server response');
        }

        return response;
    } catch (error: any) {
        console.error(`Error fetching players from ${host}:${port}: ${error.message}`);
        throw error;
    }
}

/**
 * Extracts player information from the server ping response
 * @param pingResponse The response from the Minecraft server ping
 * @returns Array of player objects with name and uuid
 */
export function extractPlayerInfo(pingResponse: any): Array<{ name: string; uuid: string }> {
    if (!pingResponse) {
        console.log('No ping response received');
        return [];
    }

    if (!pingResponse.players || !pingResponse.players.sample) {
        console.log('Server is online but no players found in server response');
        return [];
    }

    console.log(`Found ${pingResponse.players.sample.length} players in server response`);

    const players = pingResponse.players.sample
        .filter((player: any) => player && player.name && player.id)
        .map((player: any) => ({
            name: player.name,
            uuid: player.id
        }));

    console.log(`Returning ${players.length} valid players`);
    return players;
}
