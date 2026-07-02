import { and, desc, eq, gt, isNull } from "drizzle-orm"

import db from "../db"
import { CoachMember, Invite, User } from "../db/schema"

export type ClientStatus = "active" | "invite"

export type CoachClientRow = {
  id: string
  name: string
  email: string
  status: ClientStatus
  date: string
  inviteUrl?: string
}

function getAppUrl() {
  return (process.env.APP_URL ?? "http://localhost:5173").replace(/\/$/, "")
}

export async function getCoachClientRows(coachId: string): Promise<CoachClientRow[]> {
  const members = await db
    .select({
      id: User.id,
      firstName: User.firstName,
      lastName: User.lastName,
      email: User.email,
      joinedAt: CoachMember.createdAt,
    })
    .from(CoachMember)
    .innerJoin(User, eq(CoachMember.memberId, User.id))
    .where(eq(CoachMember.coachId, coachId))
    .orderBy(desc(CoachMember.createdAt))

  const pendingInvites = await db
    .select()
    .from(Invite)
    .where(
      and(
        eq(Invite.createdById, coachId),
        eq(Invite.role, "member"),
        isNull(Invite.usedAt),
        gt(Invite.expiresAt, new Date())
      )
    )
    .orderBy(desc(Invite.createdAt))

  const activeRows: CoachClientRow[] = members.map((member) => ({
    id: member.id,
    name: `${member.firstName} ${member.lastName}`.trim(),
    email: member.email,
    status: "active",
    date: member.joinedAt.toISOString(),
  }))

  const inviteRows: CoachClientRow[] = pendingInvites.map((invite) => ({
    id: invite.id,
    name: invite.email ?? "Pending invite",
    email: invite.email ?? "—",
    status: "invite",
    date: invite.createdAt.toISOString(),
    inviteUrl: `${getAppUrl()}/invite/${invite.token}`,
  }))

  return [...inviteRows, ...activeRows]
}

export type CoachClientDetail = {
  id: string
  name: string
  email: string
  joinedAt: string
}

export async function getCoachClientById(
  coachId: string,
  clientId: string
): Promise<CoachClientDetail | null> {
  const rows = await db
    .select({
      id: User.id,
      firstName: User.firstName,
      lastName: User.lastName,
      email: User.email,
      joinedAt: CoachMember.createdAt,
    })
    .from(CoachMember)
    .innerJoin(User, eq(CoachMember.memberId, User.id))
    .where(and(eq(CoachMember.coachId, coachId), eq(CoachMember.memberId, clientId)))
    .limit(1)

  const member = rows[0]
  if (!member) {
    return null
  }

  return {
    id: member.id,
    name: `${member.firstName} ${member.lastName}`.trim(),
    email: member.email,
    joinedAt: member.joinedAt.toISOString(),
  }
}
