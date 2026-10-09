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
  Link as CsLink,
  type SelectProps,
} from "@cloudscape-design/components";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DeleteZoneModal from "@/components/DeleteZoneModal";
import { useBreadcrumbs } from "@/components/ConsoleShell";
import { useHotkeys } from "@/lib/hotkeys";
import { useZones, type HostedZone, type ZoneSortBy, type ZoneTypeFilter } from "@/lib/zones";

const PAGE_SIZE = 10;

const TYPE_OPTIONS: SelectProps.Option[] = [
  { value: "all", label: "All types" },
  { value: "public", label: "Public hosted zones" },
  { value: "private", label: "Private hosted zones" },
];

export default function HostedZonesPage() {
  const router = useRouter();
  const [filterText, setFilterText] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState<ZoneTypeFilter>("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ZoneSortBy>("name");
  const [desc, setDesc] = useState(false);
  const [selected, setSelected] = useState<HostedZone[]>([]);
  const [deleting, setDeleting] = useState<HostedZone | null>(null);

  useHotkeys({ c: () => router.push("/hosted-zones/create") });

  useBreadcrumbs(useMemo(() => [{ text: "Route 53", href: "/hosted-zones" }, { text: "Hosted zones", href: "/hosted-zones" }], []));

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(filterText);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [filterText]);

  const { data, isLoading, isError, error } = useZones({ q, type, sort_by: sortBy, desc, page, page_size: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const zone = selected[0];
  const filtering = q !== "" || type !== "all";

  return (
    <>
      <Table
        variant="full-page"
        stickyHeader
        selectionType="single"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        trackBy="id"
        loading={isLoading}
        loadingText="Loading hosted zones"
        items={data?.items ?? []}
        sortingColumn={{ sortingField: sortBy }}
        sortingDescending={desc}
        onSortingChange={({ detail }) => {
          setSortBy((detail.sortingColumn.sortingField ?? "name") as ZoneSortBy);
          setDesc(Boolean(detail.isDescending));
          setPage(1);
        }}
        columnDefinitions={[
          {
            id: "name",
            header: "Hosted zone name",
            sortingField: "name",
            cell: (z) => (
              <CsLink
                href={`/hosted-zones/${z.id}`}
                onFollow={(e) => {
                  e.preventDefault();
                  router.push(`/hosted-zones/${z.id}`);
                }}
              >
                {z.name.replace(/\.$/, "")}
              </CsLink>
            ),
          },
          { id: "type", header: "Type", sortingField: "type", cell: (z) => (z.is_private ? "Private" : "Public") },
          { id: "created_by", header: "Created by", cell: () => "Route 53" },
          { id: "records", header: "Record count", sortingField: "records", cell: (z) => z.record_count },
          { id: "comment", header: "Description", cell: (z) => z.comment || "-" },
          { id: "id", header: "Hosted zone ID", cell: (z) => z.id },
        ]}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={data ? `(${data.total})` : undefined}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button disabled={!zone} onClick={() => router.push(`/hosted-zones/${zone.id}`)}>View details</Button>
                <Button disabled={!zone} onClick={() => router.push(`/hosted-zones/${zone.id}/edit`)}>Edit</Button>
                <Button disabled={!zone} onClick={() => setDeleting(zone)}>Delete</Button>
                <Button variant="primary" onClick={() => router.push("/hosted-zones/create")}>Create hosted zone</Button>
              </SpaceBetween>
            }
          >
            Hosted zones
          </Header>
        }
        filter={
          <SpaceBetween direction="horizontal" size="xs">
            <div style={{ minWidth: 320 }}>
              <TextFilter
                filteringText={filterText}
                filteringPlaceholder="Filter hosted zones by property or value"
                filteringAriaLabel="Filter hosted zones"
                countText={filtering && data ? `${data.total} ${data.total === 1 ? "match" : "matches"}` : undefined}
                onChange={({ detail }) => setFilterText(detail.filteringText)}
              />
            </div>
            <Select
              selectedOption={TYPE_OPTIONS.find((o) => o.value === type) ?? TYPE_OPTIONS[0]}
              options={TYPE_OPTIONS}
              onChange={({ detail }) => {
                setType(detail.selectedOption.value as ZoneTypeFilter);
                setPage(1);
              }}
              ariaLabel="Hosted zone type"
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
              <Box variant="p" color="inherit">No hosted zones match the filter.</Box>
              <Button onClick={() => { setFilterText(""); setType("all"); }}>Clear filter</Button>
            </Box>
          ) : (
            <Box textAlign="center" color="inherit">
              <b>No hosted zones</b>
              <Box variant="p" color="inherit">You don&apos;t have any hosted zones.</Box>
              <Button onClick={() => router.push("/hosted-zones/create")}>Create hosted zone</Button>
            </Box>
          )
        }
      />
      <DeleteZoneModal
        zone={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => setSelected([])}
      />
    </>
  );
}
