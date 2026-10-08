export interface CompanyUser { id: string; name: string; email: string; mustChangePassword: boolean; }
export type BrandTheme = 'default' | 'schramm';
export interface Appearance { primary: string; secondary: string; background: string; heading: string; font: 'system' | 'brand'; }
export interface CompanyPortal { portalSlug: string; name: string; brandColor: string; brandTheme: BrandTheme; appearance: Appearance; }
export interface Company {
  portalSlug: string;
  brandTheme: BrandTheme; appearance: Appearance;
  id: string; name: string; contactName: string; contactEmail: string; brandColor: string;
  userLimit: number; userCount: number; createdAt: number; users?: CompanyUser[];
}
export interface CompanyCreated {
  company: Company;
  credentials: { name: string; email: string; password: string }[];
  replayed: boolean;
}
