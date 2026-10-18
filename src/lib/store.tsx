import { StoreCtx, type Ctx } from "./store-context";
import { useContext, useEffect, useState, type ReactNode } from "react";
import {
  normalizeOrganization, registerOrganization, reviewOrganization, reviewOrgOffer, submitOrgOffers,
  SAMPLE_ORGANIZATIONS, type Organization, type OrgSession, type OrgStatus, type ResourceOffer,
} from "./partners";
import { SAMPLE_SCHOOLS, normalizeSchool, type School, type Verification } from "./impact";
import { submitDemoAssessment, reviewDemoAssessment, reviewDemoRequest, type DemoSession } from "./school-demo";
import { normalizeSchoolVersions } from "./assessment-versions";

const KEY = "edubridge-schools-v1";
const PKEY = "edubridge-partners-v1";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [demoSession, setDemoSession] = useState<DemoSession | null>(null);
  const [orgSession, setOrgSession] = useState<OrgSession | null>(null);
  const [schools, setSchools] = useState<School[]>(SAMPLE_SCHOOLS);
  const [selectedId, setSelectedId] = useState(SAMPLE_SCHOOLS[0]?.id ?? "");
  const [organizations, setOrganizations] = useState<Organization[]>(SAMPLE_ORGANIZATIONS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d.schools)) setSchools(normalizeSchoolVersions(d.schools).map(normalizeSchool));
        if (d.selectedId) setSelectedId(d.selectedId);
      }
    } catch {}
    try {
      const p = JSON.parse(localStorage.getItem(PKEY) ?? "null");
      if (Array.isArray(p)) {
        const normalized = p.map(normalizeOrganization).filter((o): o is Organization => o !== null);
        // Keep the fictional demo organizations available alongside saved registrations.
        const missing = SAMPLE_ORGANIZATIONS.filter((s) => !normalized.some((o) => o.id === s.id));
        setOrganizations([...normalized, ...missing]);
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify({ schools, selectedId }));
  }, [schools, selectedId, loaded]);
  useEffect(() => {
    if (loaded) localStorage.setItem(PKEY, JSON.stringify(organizations));
  }, [organizations, loaded]);

  const persistOrgs = (next: Organization[]) => {
    localStorage.setItem(PKEY, JSON.stringify(next));
    setOrganizations(next);
  };

  return (
    <StoreCtx.Provider
      value={{
        demoSession, setDemoSession,
        submitNeeds: (school) => {
          const next = submitDemoAssessment(schools, demoSession, school, new Date().toISOString());
          localStorage.setItem(KEY, JSON.stringify({ schools: next, selectedId: school.id }));
          setSchools(next); setSelectedId(school.id);
        },
        reviewNeeds: (id, status, message) => {
          const next = reviewDemoAssessment(schools, demoSession, id, status, new Date().toISOString(), message);
          localStorage.setItem(KEY, JSON.stringify({ schools: next, selectedId }));
          setSchools(next);
        },
        reviewRequest: (schoolId, requestId, status, note) => {
          const next = reviewDemoRequest(schools, demoSession, schoolId, requestId, status, new Date().toISOString(), note);
          localStorage.setItem(KEY, JSON.stringify({ schools: next, selectedId })); setSchools(next);
        },
        schools, selectedId, setSelectedId,
        addSchool: (s) => { setSchools((p) => [...p, normalizeSchool(s)]); setSelectedId(s.id); },
        updateSchool: (s) => setSchools((p) => p.map((x) => (x.id === s.id ? normalizeSchool(s) : x))),
        setVerification: (id, v) => setSchools((p) => p.map((x) => (x.id === id ? { ...x, verification: v } : x))),
        removeSchool: (id) => setSchools((p) => p.filter((x) => x.id !== id)),
        organizations, orgSession, setOrgSession,
        registerOrg: (data) => {
          const { orgs, org } = registerOrganization(organizations, data, new Date().toISOString());
          persistOrgs(orgs);
          return org;
        },
        submitOffers: (orgId, offers) => persistOrgs(submitOrgOffers(organizations, orgSession, orgId, offers, new Date().toISOString())),
        reviewOrg: (orgId, status, note) => persistOrgs(reviewOrganization(organizations, demoSession, orgId, status, new Date().toISOString(), note)),
        reviewOffer: (orgId, offerId, status, note) => persistOrgs(reviewOrgOffer(organizations, demoSession, orgId, offerId, status, new Date().toISOString(), note)),
        reset: () => { setSchools(SAMPLE_SCHOOLS); setSelectedId(SAMPLE_SCHOOLS[0]?.id ?? ""); },
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}
export function useStore() {
  const c = useContext<Ctx | null>(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}
