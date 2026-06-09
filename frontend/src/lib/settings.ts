/**
 * @deprecated
 * PublicSettings type and fetchPublicSettings are now in src/apis/settings.api.ts.
 * This file re-exports them for backwards compatibility.
 */
export type {
  PublicSettings,
} from '../apis/settings.api'

export { getPublicSettings as fetchPublicSettings } from '../apis/settings.api'

// Keep local types that are still used by consumers of this module
export type HomeFeature = { title: string; text: string; icon?: string }
