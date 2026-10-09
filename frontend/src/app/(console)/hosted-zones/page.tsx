"use client";

import {
  Box,
  Button,
  CollectionPreferences,
  Header,
  Link as CsLink,
  Pagination,
  PropertyFilter,
  SpaceBetween,
  Table,
  type PropertyFilterProps,
} from "@cloudscape-design/components";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useBreadcrumbs } from "@/components/ConsoleShell";
import DeleteZoneModal from "@/components/DeleteZoneModal";
import { EMPTY_QUERY, filterProps, queryToParams } from "@/lib/filtering";
import { useHotkeys } from "@/lib/hotkeys";
import { useZones, type HostedZone, type ZoneSortBy, type ZoneTypeFilter } from "@/lib/zones";

const FILTER_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
  { key: "name", propertyLabel: "Hosted zone name", groupValuesLabel: "Hosted zone name values", operators: [":", "="] },
  { key: "type", propertyLabel: "Type", groupValuesLabel: "Type values", operators: ["="] },
  { key: "comment", propertyLabel: "Description", groupValuesLabel: "Description values", operators: [":", "="] },
  { key: "id", propertyLabel: "Hosted zone ID", groupValuesLabel: "Hosted zone ID values", operators: [":", "="] },
];

const FILTER_OPTIONS: PropertyFilterProps.FilteringOption[] = [
  { propertyKey: "type", value: "Public" },
  { propertyKey: "type", value: "Private" },
];

export default function HostedZonesPage() {
  const router = useRouter();
  const [query, setQuery] = useState<PropertyFilterProps.Query>(EMPTY_QUERY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<ZoneSortBy>("name");
  const [desc, setDesc] = useState(false);
  const [selected, setSelected] = useState<HostedZone[]>([]);
  const [deleting, setDeleting] = useState<HostedZone | null>(null);

  useHotkeys({ c: () => router.push("/hosted-zones/create") });

  useBreadcrumbs(useMemo(() => [{ text: "Route 53", href: "/hosted-zones" }, { text: "Hosted zones", href: "/hosted-zones" }], []));

  const { q, type } = queryToParams(query);
  const { data, isLoading, isFetching, isError, error, refetch } = useZones({
    q,
    type: (type || "all") as ZoneTypeFilter,
    sort_by: sortBy,
    desc,
    page,
    page_size: pageSize,
  });
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const zone = selected[0];
  const filtering = query.tokens.length > 0;

  return (
    <>
      <Table
        variant="full-page"
        stickyHeader
        resizableColumns
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
            width: 240,
            minWidth: 160,
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
          { id: "type", header: "Type", sortingField: "type", width: 110, cell: (z) => (z.is_private ? "Private" : "Public") },
          { id: "created_by", header: "Created by", width: 150, cell: () => "Route 53" },
          { id: "records", header: "Record count", sortingField: "records", width: 150, cell: (z) => z.record_count },
          { id: "comment", header: "Description", width: 280, cell: (z) => z.comment || "-" },
          { id: "id", header: "Hosted zone ID", width: 240, cell: (z) => z.id },
        ]}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={data ? `(${data.total})` : undefined}
            description={
              <>
                Automatic mode is the current search behavior optimized for best filter results.{" "}
                <CsLink href="#settings" onFollow={(e) => e.preventDefault()}>To change modes go to settings.</CsLink>
              </>
            }
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" ariaLabel="Refresh hosted zones" loading={isFetching && !isLoading} onClick={() => refetch()} />
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
          <PropertyFilter
            {...filterProps}
            query={query}
            onChange={({ detail }) => {
              setQuery(detail);
              setPage(1);
            }}
            filteringProperties={FILTER_PROPERTIES}
            filteringOptions={FILTER_OPTIONS}
            countText={filtering && data ? `${data.total} ${data.total === 1 ? "match" : "matches"}` : undefined}
            expandToViewport
          />
        }
        pagination={<Pagination currentPageIndex={page} pagesCount={pages} onChange={({ detail }) => setPage(detail.currentPageIndex)} />}
        preferences={
          <CollectionPreferences
            title="Preferences"
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            preferences={{ pageSize }}
            pageSizePreference={{
              title: "Page size",
              options: [10, 25, 50].map((n) => ({ value: n, label: `${n} hosted zones` })),
            }}
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
              <Box variant="p" color="inherit">No hosted zones match the filter.</Box>
              <Button onClick={() => setQuery(EMPTY_QUERY)}>Clear filter</Button>
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
      <DeleteZoneModal zone={deleting} onClose={() => setDeleting(null)} onDeleted={() => setSelected([])} />
    </>
  );
}
