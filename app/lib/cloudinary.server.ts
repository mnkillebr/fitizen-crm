import {
  type FileUpload,
  type FileUploadHandler,
} from "@remix-run/form-data-parser"
import {
  v2 as cloudinary,
  type TransformationOptions,
  type UploadApiResponse,
} from "cloudinary"
import { randomUUID } from "node:crypto"

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024

export type CloudinaryImageKind =
  | "member_avatar"
  | "progress_photo"
  | "food_pic"

export type CloudinaryUploadResult = {
  publicId: string
  secureUrl: string
  width: number
  height: number
  format: string
  bytes: number
  kind: CloudinaryImageKind
  /** First eager derivative URL, when Cloudinary returns one. */
  thumbnailUrl?: string
}

/** @deprecated Prefer CloudinaryUploadResult */
export type MemberAvatarUploadResult = CloudinaryUploadResult

type UploadKindContext = {
  userId: string
}

type ImageKindConfig = {
  assetFolder: string
  maxBytes: number
  overwrite: boolean
  invalidate: boolean
  faces?: boolean
  eager?: TransformationOptions
  buildPublicId: (ctx: UploadKindContext) => string
  buildTags: (ctx: UploadKindContext) => string[]
  purpose: string
}

const IMAGE_KIND_CONFIG: Record<CloudinaryImageKind, ImageKindConfig> = {
  member_avatar: {
    assetFolder: "users/avatars",
    maxBytes: DEFAULT_MAX_BYTES,
    overwrite: true,
    invalidate: true,
    faces: true,
    eager: [
      {
        width: 200,
        height: 200,
        crop: "fill",
        gravity: "face",
        quality: "auto",
      },
    ],
    buildPublicId: ({ userId }) => `users/${userId}/avatar`,
    buildTags: ({ userId }) => ["member_avatar", `user_${userId}`],
    purpose: "member_avatar",
  },
  progress_photo: {
    assetFolder: "users/progress",
    maxBytes: DEFAULT_MAX_BYTES,
    overwrite: false,
    invalidate: false,
    faces: true,
    eager: [
      {
        width: 600,
        height: 800,
        crop: "limit",
        quality: "auto",
      },
    ],
    buildPublicId: ({ userId }) =>
      `users/${userId}/progress/${randomUUID()}`,
    buildTags: ({ userId }) => ["progress_photo", `user_${userId}`],
    purpose: "progress_photo",
  },
  food_pic: {
    assetFolder: "users/food",
    maxBytes: DEFAULT_MAX_BYTES,
    overwrite: false,
    invalidate: false,
    eager: [
      {
        width: 800,
        height: 800,
        crop: "limit",
        quality: "auto",
      },
    ],
    buildPublicId: ({ userId }) => `users/${userId}/food/${randomUUID()}`,
    buildTags: ({ userId }) => ["food_pic", `user_${userId}`],
    purpose: "food_pic",
  },
}

function configureCloudinary() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim()
  if (cloudinaryUrl) {
    // SDK reads CLOUDINARY_URL automatically when present; force secure delivery URLs.
    cloudinary.config({ secure: true })
    return
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    )
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
}

function mapUploadResult(
  result: UploadApiResponse,
  kind: CloudinaryImageKind
): CloudinaryUploadResult {
  const eager = Array.isArray(result.eager) ? result.eager : []
  const thumbnail = eager.find(
    (item): item is { secure_url: string } =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as { secure_url?: unknown }).secure_url === "string"
  )

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
    kind,
    thumbnailUrl: thumbnail?.secure_url,
  }
}

export function getMaxUploadBytes(kind: CloudinaryImageKind): number {
  return IMAGE_KIND_CONFIG[kind].maxBytes
}

/**
 * Signed server-side image upload parameterized by kind
 * (avatar, progress photo, food pic, etc.).
 */
export async function uploadImage(
  file: File,
  options: {
    userId: string
    kind: CloudinaryImageKind
  }
): Promise<CloudinaryUploadResult> {
  const { userId, kind } = options
  const config = IMAGE_KIND_CONFIG[kind]

  if (!file.type.startsWith("image/")) {
    throw new Error("Upload must be an image file.")
  }

  configureCloudinary()

  // Read first — FileUpload.size may be unavailable until the stream is consumed.
  const buffer = Buffer.from(await file.arrayBuffer())

  if (buffer.byteLength > config.maxBytes) {
    throw new Error(
      `Image must be ${Math.round(config.maxBytes / (1024 * 1024))}MB or smaller.`
    )
  }

  const ctx = { userId }
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: config.buildPublicId(ctx),
        asset_folder: config.assetFolder,
        overwrite: config.overwrite,
        invalidate: config.invalidate,
        resource_type: "image",
        faces: config.faces,
        eager: config.eager,
        context: {
          owner_id: userId,
          purpose: config.purpose,
        },
        tags: config.buildTags(ctx),
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary upload failed."))
          return
        }
        resolve(uploadResult)
      }
    )

    stream.end(buffer)
  })

  return mapUploadResult(result, kind)
}

/**
 * Builds a `parseFormData` upload handler for a Cloudinary image kind.
 * Only files whose field name matches `fieldName` and that look like images
 * are uploaded; other files are skipped (`null`).
 */
export function createCloudinaryUploadHandler(options: {
  userId: string
  kind: CloudinaryImageKind
  fieldName: string
  onUploaded?: (result: CloudinaryUploadResult) => void
}): FileUploadHandler {
  const { userId, kind, fieldName, onUploaded } = options

  return async (fileUpload: FileUpload) => {
    if (
      fileUpload.fieldName !== fieldName ||
      !fileUpload.type.startsWith("image/")
    ) {
      return null
    }

    const result = await uploadImage(fileUpload, { userId, kind })
    onUploaded?.(result)
    return result.secureUrl
  }
}

/** Convenience wrapper for member profile avatars. */
export async function uploadMemberAvatar(
  userId: string,
  file: File
): Promise<CloudinaryUploadResult> {
  return uploadImage(file, { userId, kind: "member_avatar" })
}

/** @deprecated Prefer getMaxUploadBytes("member_avatar") */
export const MAX_AVATAR_BYTES = IMAGE_KIND_CONFIG.member_avatar.maxBytes
