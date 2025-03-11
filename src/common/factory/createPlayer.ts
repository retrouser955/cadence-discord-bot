import config from 'config';
import { Player } from 'discord-player';
import { loggerService, type Logger } from '../services/logger';
import type { CreatePlayerParams } from '../../types/playerTypes';
// import { YoutubeiExtractor } from 'discord-player-youtubei';
import { DeezerExtractor, NodeDecryptor } from "discord-player-deezer"
import { DefaultExtractors } from '@discord-player/extractor';
export const createPlayer = async ({ client, executionId }: CreatePlayerParams): Promise<Player> => {
    const logger: Logger = loggerService.child({
        module: 'utilFactory',
        name: 'createPlayer',
        executionId: executionId,
        shardId: client.shard?.ids[0]
    });

    try {
        logger.debug('Creating discord-player player...');

        const player: Player = new Player(client, {
            skipFFmpeg: false
        });

        // function getAuthArrayFromEnv(): string[] {
        //     return Object.keys(process.env)
        //         .filter((v) => v.startsWith('YT_EXTRACTOR_AUTH'))
        //         .map((k) => process.env[k])
        //         .filter((v) => v !== undefined);
        // }

        // Testing out new youtube extractor
	/*
        await player.extractors.register(YoutubeiExtractor, {
            authentication: process.env.YT_EXTRACTOR_AUTH || '',
            streamOptions: {
                useClient: 'IOS',
                highWaterMark: 2 * 1_024 * 1_024 // 2MB, default is 512 KB (512 * 1_024)
            }
        });
	*/

	    await player.extractors.register(DeezerExtractor, {
	        decryptionKey: process.env.DEEZER_KEY,
            priority: 3,
            searchLimit: 25,
            arl: process.env.DEEZER_ARL!,
            decryptor: NodeDecryptor
	    });

        await player.extractors.loadMulti(DefaultExtractors);
        
        // make player accessible from anywhere in the application
        // primarily to be able to use it in broadcastEval and other sharding methods
        // @ts-ignore
        global.player = player;
        logger.trace(`discord-player loaded dependencies:\n${player.scanDeps()}`);

        return player;
    } catch (error) {
        logger.error(error, 'Failed to create discord-player player');
        throw error;
    }
};;
