"use client";

import {
  Box,
  Button,
  CollectionPreferences,
  Header,
  Link,
  Pagination,
  Select,
  SpaceBetween,
  Table,
  TextFilter,
  type SelectProps,
} from "@cloudscape-design/components";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useShell } from "@/components/ConsoleShell";
import DeleteRecordModal from "@/components/DeleteRecordModal";
import RecordDetailsPanel from "@/components/RecordDetailsPanel";
import { FILTER_PLACEHOLDER } from "@/lib/filtering";
import { useHotkeys } from "@/lib/hotkeys";
import { RECORD_TYPES, useRecords, type DnsRecord, type RecordSortBy, type RecordType } from "@/lib/records";

const TYPE_OPTIONS: SelectProps.Option[] = [
  { value: "", label: "Type" },
  ...[...RECORD_TYPES, "SOA"].map((t) => ({ value: t, label: t })),
];
const ROUTING_OPTIONS: SelectProps.Option[] = [
  { value: "", label: "Routing policy" },
  { value: "Simple", label: "Simple" },
];
const ALIAS_OPTIONS: SelectProps.Option[] = [
  { value: "", label: "Alias" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const pick = (options: SelectProps.Option[], value: string) => options.find((o) => o.value === value) ?? options[0];

export default function RecordsTable({ zoneId }: { zoneId: string }) {
  const router = useRouter();
  const { setSidePanel } = useShell();
  const [filterText, setFilterText] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState<RecordType | "">("");
  const [routing, setRouting] = useState("");
  const [alias, setAlias] = useState<"" | "yes" | "no">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<RecordSortBy>("name");
  const [desc, setDesc] = useState(false);
  const [selected, setSelected] = useState<DnsRecord[]>([]);
  const [deleting, setDeleting] = useState<DnsRecord[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(filterText);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [filterText]);

  const { data, isLoading, isFetching, isError, error, refetch } = useRecords(zoneId, {
    q,
    type,
    sort_by: sortBy,
    desc,
    page,
    page_size: pageSize,
    routing_policy: routing,
    alias,
  });
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const filtering = q !== "" || type !== "" || routing !== "" || alias !== "";
  const base = `/hosted-zones/${zoneId}/records`;

  useHotkeys({ c: () => router.push(`${base}/create`) });

  const panel = useMemo(
    () => <RecordDetailsPanel records={selected} onEdit={(r) => router.push(`${base}/${r.id}/edit`)} />,
    [selected, router, base],
  );
  useEffect(() => {
    setSidePanel(panel);
    return () => setSidePanel(null);
  }, [panel, setSidePanel]);

  function resetFilters() {
    setFilterText("");
    setType("");
    setRouting("");
    setAlias("");
  }

  return (
    <>
      <Table
        stickyHeader
        resizableColumns
        selectionType="multi"
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
          { id: "name", header: "Record name", sortingField: "name", width: 230, minWidth: 140, cell: (r) => r.name.replace(/\.$/, "") },
          { id: "type", header: "Type", sortingField: "type", width: 100, cell: (r) => r.type },
          { id: "routing", header: "Routing policy", width: 150, cell: (r) => r.routing_policy },
          { id: "differentiator", header: "Differentiator", width: 140, cell: () => "-" },
          { id: "alias", header: "Alias", width: 90, cell: () => "No" },
          {
            id: "value",
            header: "Value/Route traffic to",
            width: 360,
            minWidth: 200,
            cell: (r) => <div style={{ whiteSpace: "pre-line", wordBreak: "break-all" }}>{r.values.join("\n")}</div>,
          },
          { id: "ttl", header: "TTL (seconds)", sortingField: "ttl", width: 140, cell: (r) => r.ttl },
        ]}
        header={
          <Header
            counter={data ? `(${data.total})` : undefined}
            info={<Link variant="info">Info</Link>}
            description={
              <>
                Automatic mode is the current search behavior optimized for best filter results.{" "}
                <Link href="#settings" onFollow={(e) => e.preventDefault()}>To change modes go to settings.</Link>
              </>
            }
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" ariaLabel="Refresh records" loading={isFetching && !isLoading} onClick={() => refetch()} />
                <Button disabled={selected.length === 0} onClick={() => setDeleting(selected)}>Delete record{selected.length > 1 ? "s" : ""}</Button>
                <Button onClick={() => router.push(`${base}/import`)}>Import zone file</Button>
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
                filteringPlaceholder={FILTER_PLACEHOLDER}
                filteringAriaLabel="Filter records"
                countText={filtering && data ? `${data.total} ${data.total === 1 ? "match" : "matches"}` : undefined}
                onChange={({ detail }) => setFilterText(detail.filteringText)}
              />
            </div>
            <Select
              selectedOption={pick(TYPE_OPTIONS, type)}
              options={TYPE_OPTIONS}
              onChange={({ detail }) => { setType((detail.selectedOption.value ?? "") as RecordType | ""); setPage(1); }}
              ariaLabel="Type"
            />
            <Select
              selectedOption={pick(ROUTING_OPTIONS, routing)}
              options={ROUTING_OPTIONS}
              onChange={({ detail }) => { setRouting(detail.selectedOption.value ?? ""); setPage(1); }}
              ariaLabel="Routing policy"
            />
            <Select
              selectedOption={pick(ALIAS_OPTIONS, alias)}
              options={ALIAS_OPTIONS}
              onChange={({ detail }) => { setAlias((detail.selectedOption.value ?? "") as "" | "yes" | "no"); setPage(1); }}
              ariaLabel="Alias"
            />
          </SpaceBetween>
        }
        pagination={<Pagination currentPageIndex={page} pagesCount={pages} onChange={({ detail }) => setPage(detail.currentPageIndex)} />}
        preferences={
          <CollectionPreferences
            title="Preferences"
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            preferences={{ pageSize }}
            pageSizePreference={{ title: "Page size", options: [10, 25, 50].map((n) => ({ value: n, label: `${n} records` })) }}
            onConfirm={({ detail }) => {
              setPageSize(detail.pageSize ?? 10);
              setPage(1);
            }}
          />
        }
        empty={
          isError ? (
            <Box textAlign="center" color="text-status-error">{(error as Error).message}</Box>
          ) : filtering ? (
            <Box textAlign="center" color="inherit">
              <b>No matches</b>
              <Box variant="p" color="inherit">No records match the filter.</Box>
              <Button onClick={resetFilters}>Clear filter</Button>
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
      <DeleteRecordModal zoneId={zoneId} records={deleting} onClose={() => setDeleting([])} onDeleted={() => setSelected([])} />
    </>
  );
}
