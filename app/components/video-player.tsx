import { VideoPlayer as VideoJsPlayer } from "@videojs/react/video"
import { YouTubeVideo } from "@videojs/react/media/youtube-video"

import { VideoSkin } from "~/components/videojs/video/skin"
import { cn } from "~/lib/utils"

type VideoPlayerProps = {
  videoUrl: string
  className?: string
}

/**
 * Reusable YouTube video player built on Video.js 10 + the project VideoSkin.
 */
export function VideoPlayer({ videoUrl, className }: VideoPlayerProps) {
  return (
    <VideoJsPlayer>
      <VideoSkin className={cn("aspect-video w-full", className)}>
        <YouTubeVideo src={videoUrl} />
      </VideoSkin>
    </VideoJsPlayer>
  )
}
