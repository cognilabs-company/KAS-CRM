import { authHandlers } from './auth'
import { dashboardHandlers } from './dashboard'
import { leadsHandlers } from './leads'
import {
  chatsHandlers,
  productsHandlers,
  storesHandlers,
  usersHandlers,
  aiLogsHandlers,
  aiSettingsHandlers,
} from './other'

export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...leadsHandlers,
  ...chatsHandlers,
  ...productsHandlers,
  ...storesHandlers,
  ...usersHandlers,
  ...aiLogsHandlers,
  ...aiSettingsHandlers,
]
