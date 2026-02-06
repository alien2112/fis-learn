import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  VIDEO_PROVIDER,
  YOUTUBE_PROVIDER,
} from '../../common/external-services';
import { MuxVideoProvider } from '../../common/external-services/implementations/mux-video.provider';
import { YouTubeProviderImpl } from '../../common/external-services/implementations/youtube.provider';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';

/**
 * Video Module
 *
 * Provides video hosting and YouTube integration functionality.
 * The video provider can be swapped by changing the VIDEO_PROVIDER environment variable.
 *
 * Supported Providers:
 * - mux (default): Mux.com - Professional video hosting with DRM
 * - cloudflare: Cloudflare Stream - Cost-effective, global CDN
 * - aws-ivs: AWS Interactive Video Service
 * - bunny: Bunny.net - Budget-friendly option
 *
 * To switch providers:
 * 1. Set VIDEO_PROVIDER=cloudflare (or other provider) in .env
 * 2. Set provider-specific credentials (e.g., CLOUDFLARE_STREAM_*)
 * 3. Restart the application
 *
 * Example .env for Mux:
 * ```
 * VIDEO_PROVIDER=mux
 * MUX_TOKEN_ID=your-token-id
 * MUX_TOKEN_SECRET=your-token-secret
 * MUX_SIGNING_KEY_ID=your-signing-key-id
 * MUX_SIGNING_KEY_SECRET=your-signing-key-secret
 * MUX_WEBHOOK_SECRET=your-webhook-secret
 * ```
 */
@Module({})
export class VideoModule {
  /**
   * Register the video module with dynamic provider selection
   */
  static forRoot(): DynamicModule {
    return {
      module: VideoModule,
      imports: [ConfigModule, PrismaModule],
      controllers: [VideoController],
      providers: [
        // Video Service (orchestrates providers)
        VideoService,

        // Video Provider (primary video hosting)
        {
          provide: VIDEO_PROVIDER,
          useFactory: (configService: ConfigService) => {
            const provider = configService.get<string>('VIDEO_PROVIDER', 'mux');

            switch (provider) {
              case 'mux':
              default:
                return new MuxVideoProvider(configService);

              // Add more providers as they're implemented:
              // case 'cloudflare':
              //   return new CloudflareVideoProvider(configService);
              // case 'aws-ivs':
              //   return new AwsIvsVideoProvider(configService);
              // case 'bunny':
              //   return new BunnyVideoProvider(configService);
            }
          },
          inject: [ConfigService],
        },

        // YouTube Provider (secondary source)
        {
          provide: YOUTUBE_PROVIDER,
          useFactory: (configService: ConfigService) => {
            return new YouTubeProviderImpl(configService);
          },
          inject: [ConfigService],
        },
      ],
      exports: [VideoService, VIDEO_PROVIDER, YOUTUBE_PROVIDER],
    };
  }

  /**
   * Register for specific provider (useful for testing)
   */
  static forFeature(options: {
    videoProvider?: Provider;
    youtubeProvider?: Provider;
  }): DynamicModule {
    const providers: Provider[] = [VideoService];

    if (options.videoProvider) {
      providers.push(options.videoProvider);
    } else {
      providers.push({
        provide: VIDEO_PROVIDER,
        useClass: MuxVideoProvider,
      });
    }

    if (options.youtubeProvider) {
      providers.push(options.youtubeProvider);
    } else {
      providers.push({
        provide: YOUTUBE_PROVIDER,
        useClass: YouTubeProviderImpl,
      });
    }

    return {
      module: VideoModule,
      imports: [ConfigModule, PrismaModule],
      controllers: [VideoController],
      providers,
      exports: [VideoService, VIDEO_PROVIDER, YOUTUBE_PROVIDER],
    };
  }
}
