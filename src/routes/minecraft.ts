import { Router, Request, Response } from 'express';
import { fetchMinecraftPlayers, extractPlayerInfo } from '../handlers/minecraft/playerFetcher';

const router = Router();

/**
 * Endpoint to fetch players from a Minecraft server
 * @route GET /minecraft/players
 * @param {string} id - The container ID
 * @param {string} host - The host to ping (usually the node's address)
 * @param {number} port - The port to ping
 * @returns {Object} Players information
 */
router.get('/minecraft/players', async (req: Request, res: Response) => {
    const { id, host, port } = req.query;
    const containerId = id as string;

    if (!id || !host || !port) {
        res.status(400).json({
            error: 'Container ID, host, and port are required.',
            players: []
        });
        return;
    }

    // Validate port is a number
    const portNum = parseInt(port as string, 10);
    if (isNaN(portNum)) {
        res.status(400).json({
            error: 'Port must be a valid number.',
            players: []
        });
        return;
    }

    console.log(`Fetching players for container ${containerId} at ${host}:${portNum}`);

    try {
        // Use our real implementation to fetch players directly from the Minecraft server
        const pingResponse = await fetchMinecraftPlayers(
            host as string,
            portNum,
            5000 // 5 second timeout
        );

        // Server is online if we got a ping response with version info
        const serverIsOnline = !!pingResponse && !!pingResponse.version;

        // Extract real player data from the server response
        const players = extractPlayerInfo(pingResponse);

        // Log detailed information about the server
        console.log(`Successfully pinged container ${containerId}`);
        console.log(`Server version: ${pingResponse.version?.name || 'Unknown'}`);
        console.log(`Server online: ${serverIsOnline ? 'Yes' : 'No'}`);
        console.log(`Players: ${players.length} of ${pingResponse.players?.max || 0}`);

        // Get description text from the response
        let description = '';
        if (typeof pingResponse.description === 'string') {
            description = pingResponse.description;
        } else if (pingResponse.description?.text) {
            description = pingResponse.description.text;
        }

        // Return real data from the server
        res.status(200).json({
            players,
            maxPlayers: pingResponse.players?.max || 0,
            onlinePlayers: pingResponse.players?.online || 0,
            description: description,
            version: pingResponse.version?.name || '',
            online: serverIsOnline
        });

        // Log the actual response we're sending back
        console.log(`Sending response with ${players.length} players, online: ${pingResponse.players?.online || 0}, max: ${pingResponse.players?.max || 0}`);
    } catch (error: any) {
        console.error(`Error fetching players for container ${containerId}: ${error.message}`);
        res.status(500).json({
            error: `Failed to fetch players: ${error.message || 'Unknown error'}`,
            players: [],
            maxPlayers: 0,
            onlinePlayers: 0,
            version: ''
        });
    }
});

export default router;
