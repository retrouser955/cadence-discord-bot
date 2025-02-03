import {
    type GuildQueue,
    LrcSearchResult,
    type Player,
    QueryType,
    type SearchResult,
    type Track,
    useMainPlayer,
    useQueue
} from 'discord-player';
import { type ChatInputCommandInteraction, EmbedBuilder, type Message, SlashCommandBuilder } from 'discord.js';
import type { Logger } from '../../common/services/logger';
import { BaseSlashCommandInteraction } from '../../common/classes/interactions';
import type { BaseSlashCommandParams, BaseSlashCommandReturnType } from '../../types/interactionTypes';
import { checkQueueCurrentTrack, checkQueueExists } from '../../common/validation/queueValidator';
import { checkInVoiceChannel, checkSameVoiceChannel } from '../../common/validation/voiceChannelValidator';
import { localizeCommand, useServerTranslator, type Translator } from '../../common/utils/localeUtil';

class LyricsCommand extends BaseSlashCommandInteraction {
    constructor() {
        const data = localizeCommand(
            new SlashCommandBuilder()
                .setName('lyrics')
                .addStringOption((option) =>
                    option.setName('query').setRequired(false).setMinLength(2).setMaxLength(500).setAutocomplete(true)
                )
        );
        super(data);
    }

    async execute(params: BaseSlashCommandParams): BaseSlashCommandReturnType {
        const { executionId, interaction } = params;
        const logger = this.getLogger(this.name, executionId, interaction);
        const translator = useServerTranslator(interaction);

        const queue: GuildQueue = useQueue(interaction.guild!.id)!;
        const query = interaction.options.getString('query');

        if (!query) {
            await this.runValidators({ interaction, queue, executionId }, [
                checkInVoiceChannel,
                checkSameVoiceChannel,
                checkQueueExists,
                checkQueueCurrentTrack
            ]);

            await interaction.deferReply();

            const nowPlaying = queue.currentTrack!;
            const searchQuery = `${nowPlaying.author} ${nowPlaying.url.startsWith("https://youtube.com") ? nowPlaying.cleanTitle : nowPlaying.title}`;

            const lyrics = await player.lyrics.search({
                q: searchQuery
            });

            if(!lyrics[0]) return this.sendNotFoundEmbed(interaction, searchQuery);

            return this.sendLyricsEmbed(interaction, lyrics[0].plainLyrics, searchQuery);
        }

        await interaction.deferReply();
        logger.debug('Interaction deferred.');

        if(query) {
            const songId = parseInt(query, 10);

            if(isNaN(songId)) {
                return this.sendNotFoundEmbed(interaction, query);
            }
            
            const lyrics = await player.lyrics.getById(songId).catch(() => null);

            if(!lyrics) {
                return this.sendNotFoundEmbed(interaction, query);
            }

            return this.sendLyricsEmbed(interaction, lyrics.plainLyrics, `${lyrics.artistName} - ${lyrics.name}`)
        }
    }

    private sendNotFoundEmbed(ctx: ChatInputCommandInteraction, query: string) {
        const embed = new EmbedBuilder()
        .setTitle("No results found")
        .setColor("Red")
        .setDescription(`No lyrics were found for \`${query}\``)

        ctx.followUp({
            embeds: [embed]
        })
    }

    private sendLyricsEmbed(ctx: ChatInputCommandInteraction, lyrics: string, query: string) {
        const embed = new EmbedBuilder()
        .setTitle(query)
        .setColor("Blue");

        if(lyrics.length > 4096) lyrics = `${lyrics.substring(0, 4093)}...`;

        embed.setDescription(lyrics);

        ctx.followUp({
            embeds: [embed]
        })
    }
}

export default new LyricsCommand();
