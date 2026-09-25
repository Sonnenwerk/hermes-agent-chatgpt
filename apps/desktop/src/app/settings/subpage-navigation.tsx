import { useI18n } from '@/i18n'

import type { OverlayNavGroup, OverlayNavLink } from '../overlays/overlay-split-layout'
import { OverlayBreadcrumbHeader } from '../overlays/overlay-breadcrumb-header'

export function SettingsSubpageHeader({ group, child }: { group: OverlayNavGroup; child?: OverlayNavLink }) {
  const { t } = useI18n()

  return <OverlayBreadcrumbHeader child={child} group={group} rootLabel={t.commandCenter.settings} />
}
