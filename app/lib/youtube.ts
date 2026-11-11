/** Extract a YouTube video id from common watch / short / embed URLs. */
export function getYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim())
    const host = parsed.hostname.replace(/^www\./, "")

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0]
      return id || null
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const fromQuery = parsed.searchParams.get("v")
      if (fromQuery) {
        return fromQuery
      }

      const segments = parsed.pathname.split("/").filter(Boolean)
      const markerIndex = segments.findIndex((segment) =>
        ["embed", "shorts", "live", "v"].includes(segment)
      )

      if (markerIndex >= 0 && segments[markerIndex + 1]) {
        return segments[markerIndex + 1]
      }
    }
  } catch {
    return null
  }

  return null
}

/** Standard YouTube thumbnail for list/preview UIs. */
export function getYoutubeThumbnailUrl(url: string): string | null {
  const id = getYoutubeVideoId(url)
  if (!id) {
    return null
  }

  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`
}
