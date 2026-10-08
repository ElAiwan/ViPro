import type { CSSProperties } from 'react';
import type { Appearance, BrandTheme, CompanyPortal } from './types';

export function presetAppearance(theme: BrandTheme, primary = '#247b84'): Appearance {
  return theme === 'schramm'
    ? {primary:'#009cdc',secondary:'#2bad70',background:'#ffffff',heading:'#282727',font:'brand'}
    : {primary,secondary:'#517d72',background:'#f3f6f6',heading:'#163e47',font:'system'};
}
export function appearanceStyle(company: CompanyPortal): CSSProperties {
  const a=company.appearance ?? presetAppearance(company.brandTheme,company.brandColor);
  return {
    '--company-primary':a.primary,'--company-secondary':a.secondary,'--company-background':a.background,
    '--company-heading':a.heading,'--company-body-font':a.font==='brand' ? "'Montserrat', 'Segoe UI', sans-serif" : "'Avenir Next', 'Segoe UI', sans-serif",
    '--company-heading-font':a.font==='brand' ? "'Nohemi', 'Outfit', 'Montserrat', 'Segoe UI', sans-serif" : "'Avenir Next', 'Segoe UI', sans-serif",
  } as CSSProperties;
}
