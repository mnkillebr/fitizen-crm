import { and, asc, desc, eq } from "drizzle-orm"

import db from "../db"
import { InBodyScan } from "../db/schema"
import type { InBodyFormValues } from "../app/lib/inbody-form"
import { scannedAtToDate } from "../app/lib/inbody-form"
import { getCoachClientById } from "./client.server"

export type InBodyScanSelect = typeof InBodyScan.$inferSelect
export type InBodyScanInsert = typeof InBodyScan.$inferInsert

export type InBodyScanUpdate = Partial<
  Pick<
    InBodyScanInsert,
    | "scannedAt"
    | "weightLbs"
    | "skeletalMuscleMassLbs"
    | "percentBodyFat"
    | "ecwRatio"
    | "basalMetabolicRate"
    | "notes"
    | "updatedAt"
  >
>

function metricsFromForm(values: InBodyFormValues) {
  return {
    scannedAt: scannedAtToDate(values.scannedAt),
    weightLbs: values.weightLbs,
    skeletalMuscleMassLbs: values.skeletalMuscleMassLbs,
    percentBodyFat: values.percentBodyFat,
    ecwRatio: values.ecwRatio,
    basalMetabolicRate: values.basalMetabolicRate,
    notes: values.notes ?? null,
  }
}

export function createInBodyScan(
  memberId: string,
  recordedById: string,
  values: InBodyFormValues
) {
  const now = new Date()

  return db
    .insert(InBodyScan)
    .values({
      memberId,
      recordedById,
      ...metricsFromForm(values),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
}

export function getInBodyScanById(id: string) {
  return db.select().from(InBodyScan).where(eq(InBodyScan.id, id))
}

export function getInBodyScansForMember(
  memberId: string,
  order: "asc" | "desc" = "desc"
) {
  return db
    .select()
    .from(InBodyScan)
    .where(eq(InBodyScan.memberId, memberId))
    .orderBy(order === "asc" ? asc(InBodyScan.scannedAt) : desc(InBodyScan.scannedAt))
}

export async function getMemberInBodyScan(memberId: string, scanId: string) {
  const rows = await db
    .select()
    .from(InBodyScan)
    .where(and(eq(InBodyScan.id, scanId), eq(InBodyScan.memberId, memberId)))
    .limit(1)

  return rows[0] ?? null
}

export async function updateInBodyScan(
  memberId: string,
  scanId: string,
  values: InBodyFormValues
) {
  const existing = await getMemberInBodyScan(memberId, scanId)
  if (!existing) {
    return null
  }

  const [updated] = await db
    .update(InBodyScan)
    .set({
      ...metricsFromForm(values),
      updatedAt: new Date(),
    })
    .where(and(eq(InBodyScan.id, scanId), eq(InBodyScan.memberId, memberId)))
    .returning()

  return updated ?? null
}

export async function deleteInBodyScan(memberId: string, scanId: string) {
  const existing = await getMemberInBodyScan(memberId, scanId)
  if (!existing) {
    return null
  }

  const [deleted] = await db
    .delete(InBodyScan)
    .where(and(eq(InBodyScan.id, scanId), eq(InBodyScan.memberId, memberId)))
    .returning()

  return deleted ?? null
}

export async function createCoachInBodyScan(
  coachId: string,
  memberId: string,
  recordedById: string,
  values: InBodyFormValues
) {
  const client = await getCoachClientById(coachId, memberId)
  if (!client) {
    return null
  }

  const [scan] = await createInBodyScan(memberId, recordedById, values)
  return scan ?? null
}

export async function updateCoachInBodyScan(
  coachId: string,
  memberId: string,
  scanId: string,
  values: InBodyFormValues
) {
  const client = await getCoachClientById(coachId, memberId)
  if (!client) {
    return null
  }

  return updateInBodyScan(memberId, scanId, values)
}

export async function deleteCoachInBodyScan(
  coachId: string,
  memberId: string,
  scanId: string
) {
  const client = await getCoachClientById(coachId, memberId)
  if (!client) {
    return null
  }

  return deleteInBodyScan(memberId, scanId)
}

export async function getCoachInBodyScansForMember(
  coachId: string,
  memberId: string,
  order: "asc" | "desc" = "desc"
) {
  const client = await getCoachClientById(coachId, memberId)
  if (!client) {
    return null
  }

  return getInBodyScansForMember(memberId, order)
}
