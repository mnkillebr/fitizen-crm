import { PlayIcon, VideoCameraSlashIcon } from "@phosphor-icons/react"
import { useState } from "react"

import { VideoPlayer } from "~/components/video-player"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { getYoutubeThumbnailUrl } from "~/lib/youtube"
import { cn } from "~/lib/utils"

type ExerciseVideoDialogProps = {
  exerciseName: string
  videoUrl: string | null | undefined
  className?: string
}

export function ExerciseVideoDialog({
  exerciseName,
  videoUrl,
  className,
}: ExerciseVideoDialogProps) {
  const [open, setOpen] = useState(false)
  const thumbnailUrl = videoUrl ? getYoutubeThumbnailUrl(videoUrl) : null

  if (!videoUrl) {
    return (
      <div
        className={cn(
          "flex aspect-video w-20 items-center justify-center rounded-md border border-dashed bg-muted/40 text-muted-foreground",
          className
        )}
        aria-label="No video available"
        title="No video available"
      >
        <VideoCameraSlashIcon className="size-4" />
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "group relative aspect-video w-20 overflow-hidden rounded-md border bg-muted text-left outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
          aria-label={`Play video for ${exerciseName}`}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-muted">
              <PlayIcon className="size-5 text-muted-foreground" weight="fill" />
            </div>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/35 transition-colors group-hover:bg-black/45">
            <span className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white">
              <PlayIcon className="size-3.5" weight="fill" />
            </span>
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle className="pr-8 text-base">{exerciseName}</DialogTitle>
        </DialogHeader>
        {open ? <VideoPlayer videoUrl={videoUrl} /> : null}
      </DialogContent>
    </Dialog>
  )
}
