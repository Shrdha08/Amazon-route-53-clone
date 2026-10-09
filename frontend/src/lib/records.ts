import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { zoneKeys } from "./zones";

export const RECORD_TYPES = ["A", "AAAA", "CAA", "CNAME", "MX", "NS", "PTR", "SRV", "TXT"] as const;
export type CreatableRecordType = (typeof RECORD_TYPES)[number];
export type RecordType = CreatableRecordType | "SOA";
export type RecordSortBy = "name" | "type" | "ttl";

export interface DnsRecord {
  id: number;
  zone_id: string;
  name: string;
  type: RecordType;
  ttl: number;
  values: string[];
  routing_policy: string;
  created_at: string;
  updated_at: string;
}

export interface RecordPage {
  items: DnsRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface RecordListParams {
  q: string;
  type: RecordType | "";
  sort_by: RecordSortBy;
  desc: boolean;
  page: number;
  page_size: number;
}

export interface RecordInput {
  name: string;
  type: CreatableRecordType;
  ttl: number;
  values: string[];
}

export const recordKeys = {
  all: (zoneId: string) => ["records", zoneId] as const,
  list: (zoneId: string, p: RecordListParams) => ["records", zoneId, "list", p] as const,
  one: (zoneId: string, id: number) => ["records", zoneId, "one", id] as const,
};

function base(zoneId: string) {
  return `/hosted-zones/${zoneId}/records`;
}

export function useRecords(zoneId: string, params: RecordListParams) {
  return useQuery({
    queryKey: recordKeys.list(zoneId, params),
    queryFn: () => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => v !== "" && qs.set(k, String(v)));
      return api<RecordPage>(`${base(zoneId)}?${qs}`);
    },
    placeholderData: keepPreviousData,
  });
}

/** The API has no single-record GET, so edit pages find the record in a large page. */
export function useRecord(zoneId: string, recordId: number) {
  return useQuery({
    queryKey: recordKeys.one(zoneId, recordId),
    queryFn: async () => {
      const page = await api<RecordPage>(`${base(zoneId)}?page_size=100`);
      const rec = page.items.find((r) => r.id === recordId);
      if (rec) return rec;
      throw new Error(`No record found with ID: ${recordId}`);
    },
  });
}

function useInvalidate(zoneId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: recordKeys.all(zoneId) }),
      qc.invalidateQueries({ queryKey: zoneKeys.all }), // record counts live on zones
    ]);
}

export function useCreateRecord(zoneId: string) {
  const invalidate = useInvalidate(zoneId);
  return useMutation({
    mutationFn: (input: RecordInput) => api<DnsRecord>(base(zoneId), { method: "POST", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateRecord(zoneId: string, recordId: number) {
  const invalidate = useInvalidate(zoneId);
  return useMutation({
    mutationFn: (input: Pick<RecordInput, "ttl" | "values">) =>
      api<DnsRecord>(`${base(zoneId)}/${recordId}`, { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useDeleteRecord(zoneId: string) {
  const invalidate = useInvalidate(zoneId);
  return useMutation({
    mutationFn: (recordId: number) => api<void>(`${base(zoneId)}/${recordId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
