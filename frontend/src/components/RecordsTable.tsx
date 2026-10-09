"use client";

import {
  Box,
  Button,
  Header,
  Pagination,
  Select,
  SpaceBetween,
  Table,
  TextFilter,
  type SelectProps,
} from "@cloudscape-design/components";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DeleteRecordModal from "@/components/DeleteRecordModal";
import { RECORD_TYPES, useRecords, type DnsRecord, type RecordSortBy, type RecordType } from "@/lib/records";

const PAGE_SIZE = 10;

const TYPE_OPTIONS: SelectProps.Option[] = [
  { value: "", label: "All types" },
  ...[...RECORD_TYPES, "SOA"].map((t) => ({ value: t, label: t })),
];

export default function RecordsTable({ zoneId }: { zoneId: string }) {
  const router = useRouter();
  const [filterText, setFilterText] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState<RecordType | "">("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<RecordSortBy>("name");
  const [desc, setDesc] = useState(false);
  const [selected, setSelected] = useState<DnsRecord[]>([]);
  const [deleting, setDeleting] = useState<DnsRecord | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(filterText);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [filterText]);

  const { data, isLoading, isError, error } = useRecords(zoneId, { q, type, sort_by: sortBy, desc, page, page_size: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const record = selected[0];
  const filtering = q !== "" || type !== "";
  const base = `/hosted-zones/${zoneId}/records`;

  return (
    <>
      <Table
        stickyHeader
        selectionType="single"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        trackBy="id"
        loading={isLoading}
        loadingText="Loading records"
        items={data?.items ?? []}
        sortingColumn={{ sortingField: sortBy }}
        sortingDescending={desc}
        onSortingChange={({ detail }) => {
          setSortBy((detail.sortingColumn.sortingField ?? "name") as RecordSortBy);
          setDesc(Boolean(detail.isDescending));
          setPage(1);
        }}
        wrapLines
        columnDefinitions={[
          { id: "name", header: "Record name", sortingField: "name", cell: (r) => r.name.replace(/\.$/, "") },
          { id: "type", header: "Type", sortingField: "type", cell: (r) => r.type },
          { id: "routing", header: "Routing policy", cell: (r) => r.routing_policy },
          { id: "differentiator", header: "Differentiator", cell: () => "-" },
          { id: "alias", header: "Alias", cell: () => "No" },
          {
            id: "value",
            header: "Value/Route traffic to",
            cell: (r) => (
              <div style={{ whiteSpace: "pre-line", wordBreak: "break-all" }}>{r.values.join("\n")}</div>
            ),
          },
          { id: "ttl", header: "TTL (seconds)", sortingField: "ttl", cell: (r) => r.ttl },
        ]}
        header={
          <Header
            counter={data ? `(${data.total})` : undefined}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button disabled={!record} onClick={() => setDeleting(record)}>Delete record</Button>
                <Button disabled={!record} onClick={() => router.push(`${base}/${record.id}/edit`)}>Edit record</Button>
                <Button variant="primary" onClick={() => router.push(`${base}/create`)}>Create record</Button>
              </SpaceBetween>
            }
          >
            Records
          </Header>
        }
        filter={
          <SpaceBetween direction="horizontal" size="xs">
            <div style={{ minWidth: 320 }}>
              <TextFilter
                filteringText={filterText}
                filteringPlaceholder="Filter records by property or value"
                filteringAriaLabel="Filter records"
                countText={filtering && data ? `${data.total} ${data.total === 1 ? "match" : "matches"}` : undefined}
                onChange={({ detail }) => setFilterText(detail.filteringText)}
              />
            </div>
            <Select
              selectedOption={TYPE_OPTIONS.find((o) => o.value === type) ?? TYPE_OPTIONS[0]}
              options={TYPE_OPTIONS}
              onChange={({ detail }) => {
                setType((detail.selectedOption.value ?? "") as RecordType | "");
                setPage(1);
              }}
              ariaLabel="Record type"
            />
          </SpaceBetween>
        }
        pagination={<Pagination currentPageIndex={page} pagesCount={pages} onChange={({ detail }) => setPage(detail.currentPageIndex)} />}
        empty={
          isError ? (
            <Box textAlign="center" color="text-status-error">{(error as Error).message}</Box>
          ) : filtering ? (
            <Box textAlign="center" color="inherit">
              <b>No matches</b>
              <Box variant="p" color="inherit">No records match the filter.</Box>
              <Button onClick={() => { setFilterText(""); setType(""); }}>Clear filter</Button>
            </Box>
          ) : (
            <Box textAlign="center" color="inherit">
              <b>No records</b>
              <Box variant="p" color="inherit">This hosted zone has no records.</Box>
              <Button onClick={() => router.push(`${base}/create`)}>Create record</Button>
            </Box>
          )
        }
      />
      <DeleteRecordModal zoneId={zoneId} record={deleting} onClose={() => setDeleting(null)} onDeleted={() => setSelected([])} />
    </>
  );
}
