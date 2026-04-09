import { AxiosError } from 'axios'

interface BackendValidationIssue {
  loc?: Array<string | number>
  msg?: string
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "So'rovni bajarib bo'lmadi"
) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail

    if (Array.isArray(detail) && detail.length > 0) {
      const firstIssue = detail[0] as BackendValidationIssue
      const fieldPath = firstIssue.loc?.slice(1).join('.')
      const message = firstIssue.msg ?? fallback
      return fieldPath ? `${fieldPath}: ${message}` : message
    }

    if (typeof detail === 'string' && detail.trim()) {
      return detail
    }

    if (typeof error.response?.data?.message === 'string' && error.response.data.message.trim()) {
      return error.response.data.message
    }
  }

  return fallback
}
