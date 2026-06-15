const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:18033/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await response.json()
      const message = extractErrorMessage(data)
      throw new Error(message || `请求失败: ${response.status}`)
    }
    const message = await response.text()
    throw new Error(message || `请求失败: ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }
  return response.json()
}

function extractErrorMessage(data) {
  if (typeof data === 'string') {
    return data
  }
  if (data.detail) {
    return data.detail
  }
  const values = []
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) {
      values.push(...value.filter((v) => typeof v === 'string'))
    } else if (typeof value === 'string') {
      values.push(value)
    }
  }
  if (values.length) {
    return values.join('\n')
  }
  return null
}

export const api = {
  listLicenses: (params = {}) => request(`/licenses/?${new URLSearchParams(params)}`),
  createLicense: (data) => request('/licenses/', { method: 'POST', body: JSON.stringify(data) }),
  updateLicense: (id, data) => request(`/licenses/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  listBorrowRecords: (params = {}) => request(`/borrow-records/?${new URLSearchParams(params)}`),
  createBorrowRecord: (data) => request('/borrow-records/', { method: 'POST', body: JSON.stringify(data) }),
  updateBorrowRecord: (id, data) => request(`/borrow-records/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  stats: () => request('/stats/'),
}
