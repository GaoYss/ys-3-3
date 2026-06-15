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

const fieldLabelMap = {
  license: '证照',
  borrower: '借用人',
  borrower_department: '借用部门',
  purpose: '用途',
  borrow_date: '借出日期',
  expected_return_date: '预计归还日期',
  actual_return_date: '实际归还日期',
}

function extractErrorMessage(data) {
  if (typeof data === 'string') {
    return data
  }
  if (data.detail) {
    return data.detail
  }
  const messages = []
  for (const [key, value] of Object.entries(data)) {
    const label = fieldLabelMap[key] || key
    if (Array.isArray(value)) {
      for (const msg of value) {
        if (typeof msg === 'string') {
          messages.push(`${label}：${msg}`)
        }
      }
    } else if (typeof value === 'string') {
      messages.push(`${label}：${value}`)
    }
  }
  if (messages.length) {
    return messages.join('\n')
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
