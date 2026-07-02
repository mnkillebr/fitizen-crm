import { CopyIcon } from "@phosphor-icons/react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useState } from "react"
import { Link } from "react-router"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import type { CoachClientRow } from "../../models/client.server"

const columnHelper = createColumnHelper<CoachClientRow>()

type ClientsTableProps = {
  clients: CoachClientRow[]
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  async function copyInviteUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    window.setTimeout(() => setCopiedUrl(null), 2000)
  }

  const columns = [
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => {
        const row = info.row.original

        if (row.status === "active") {
          return (
            <Link
              to={`/dashboard/coach/client/${row.id}`}
              className="font-medium text-primary hover:underline"
            >
              {info.getValue()}
            </Link>
          )
        }

        return info.getValue()
      },
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue()
        return (
          <Badge variant={status === "active" ? "default" : "secondary"}>
            {status === "active" ? "Active" : "Invite"}
          </Badge>
        )
      },
    }),
    columnHelper.accessor("date", {
      header: "Date",
      cell: (info) => {
        const row = info.row.original
        const label = row.status === "active" ? "Joined" : "Invited"
        return (
          <span className="text-muted-foreground">
            {label} {new Date(info.getValue()).toLocaleDateString()}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const inviteUrl = info.row.original.inviteUrl

        if (!inviteUrl) {
          return null
        }

        return (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copyInviteUrl(inviteUrl)}
          >
            <CopyIcon />
            {copiedUrl === inviteUrl ? "Copied" : "Copy link"}
          </Button>
        )
      },
    }),
  ]

  const table = useReactTable({
    data: clients,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (clients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">No clients yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate an invite link above to add your first client to the roster.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
