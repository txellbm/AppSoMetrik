
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DataTableProps = {
    headers: string[];
    rows: { key: string; cells: (string | number | React.ReactNode)[] }[];
    emptyMessage: string;
}

export function DataTable({ headers, rows, emptyMessage }: DataTableProps) {
    return (
        <div className="max-h-96 overflow-y-auto rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length > 0 ? (
                        rows.map(row => (
                            <TableRow key={row.key}>
                                {row.cells.map((cell, i) => 
                                    <TableCell key={i} className={typeof cell === 'number' ? 'text-right' : ''}>
                                        {cell}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={headers.length} className="text-center h-24 text-muted-foreground">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
