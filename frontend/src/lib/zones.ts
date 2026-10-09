import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface Tag {
  key: string;
  value: string;
}

export interface HostedZone {
  id: string;
  name: string;
  comment: string;
  is_private: boolean;
  vpc_region: string | null;
  vpc_id: string | null;
  record_count: number;
  tags: Tag[];
  created_at: string;
}

export interface ZonePage {
  items: HostedZone[];
  total: number;
  page: number;
  page_size: number;
}

export type ZoneTypeFilter = "all" | "public" | "private";
export type ZoneSortBy = "name" | "type" | "records" | "created";

export interface ZoneListParams {
  q: string;
  type: ZoneTypeFilter;
  sort_by: ZoneSortBy;
  desc: boolean;
  page: number;
  page_size: number;
}

export interface ZoneCreateInput {
  name: string;
  comment: string;
  is_private: boolean;
  vpc_region?: string | null;
  vpc_id?: string | null;
  tags: Tag[];
}

export const zoneKeys = {
  all: ["zones"] as const,
  list: (p: ZoneListParams) => ["zones", "list", p] as const,
  detail: (id: string) => ["zones", "detail", id] as const,
};

export function useZones(params: ZoneListParams) {
  return useQuery({
    queryKey: zoneKeys.list(params),
    queryFn: () => api<ZonePage>(`/hosted-zones?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`),
    placeholderData: keepPreviousData,
  });
}

export function useZone(id: string) {
  return useQuery({ queryKey: zoneKeys.detail(id), queryFn: () => api<HostedZone>(`/hosted-zones/${id}`) });
}

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ZoneCreateInput) => api<HostedZone>("/hosted-zones", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}

export function useUpdateZone(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (comment: string) => api<HostedZone>(`/hosted-zones/${id}`, { method: "PATCH", body: JSON.stringify({ comment }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/hosted-zones/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}
