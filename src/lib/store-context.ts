import { createContext, type Context } from "react";
import type { RequestStatus } from "./resource-requests";
import type { Organization, OrgSession, OrgStatus, ResourceOffer, registerOrganization } from "./partners";
import type { School, Verification } from "./impact";
import type { DemoSession } from "./school-demo";

export interface Ctx {
  demoSession: DemoSession | null;
  setDemoSession: (session: DemoSession | null) => void;
  submitNeeds: (school: School) => void;
  reviewRequest: (schoolId: string, requestId: string, status: RequestStatus, note?: string) => void;
  reviewNeeds: (id: string, status: Verification, message?: string) => void;
  schools: School[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  addSchool: (s: School) => void;
  updateSchool: (s: School) => void;
  setVerification: (id: string, v: Verification) => void;
  removeSchool: (id: string) => void;
  reset: () => void;
  organizations: Organization[];
  orgSession: OrgSession | null;
  setOrgSession: (session: OrgSession | null) => void;
  registerOrg: (data: Parameters<typeof registerOrganization>[1]) => Organization;
  submitOffers: (orgId: string, offers: ResourceOffer[]) => void;
  reviewOrg: (orgId: string, status: OrgStatus, note?: string) => void;
  reviewOffer: (orgId: string, offerId: string, status: RequestStatus, note?: string) => void;
}
export const StoreCtx: Context<Ctx | null> = import.meta.hot?.data?.storeContext ?? createContext<Ctx | null>(null);
if (import.meta.hot?.data) import.meta.hot.data.storeContext = StoreCtx;

