/** Console sections that are intentionally "coming soon", keyed by URL path. */
export interface Placeholder {
  title: string;
  description: string;
}

export const PLACEHOLDERS: Record<string, Placeholder> = {
  dashboard: { title: "Dashboard", description: "An overview of your hosted zones, health checks and resolver activity will appear here." },
  "health-checks": { title: "Health checks", description: "Health checks for monitoring endpoints are not available in this clone yet." },
  profiles: { title: "Profiles", description: "Route 53 profiles for sharing DNS settings across VPCs and accounts are not available in this clone yet." },
  "cidr-collections": { title: "CIDR collections", description: "CIDR collections for IP-based routing are not available in this clone yet." },
  "traffic-policies": { title: "Traffic policies", description: "Traffic policies for routing traffic across endpoints are not available in this clone yet." },
  "policy-records": { title: "Policy records", description: "Policy records that apply traffic policies to domain names are not available in this clone yet." },
  "registered-domains": { title: "Registered domains", description: "Domain registration is not available in this clone." },
  requests: { title: "Requests", description: "Domain registration and transfer requests are not available in this clone." },
  resolver: { title: "Resolver", description: "Resolver endpoints and rules are not available in this clone yet." },
  "resolver/vpcs": { title: "VPCs", description: "Resolver VPC settings are not available in this clone yet." },
  "resolver/inbound-endpoints": { title: "Inbound endpoints", description: "Resolver inbound endpoints are not available in this clone yet." },
  "resolver/outbound-endpoints": { title: "Outbound endpoints", description: "Resolver outbound endpoints are not available in this clone yet." },
  "resolver/rules": { title: "Rules", description: "Resolver rules are not available in this clone yet." },
  "resolver/query-logging": { title: "Query logging", description: "Resolver query logging is not available in this clone yet." },
  "resolver/outposts": { title: "Outposts", description: "Resolver on Outposts is not available in this clone yet." },
};
