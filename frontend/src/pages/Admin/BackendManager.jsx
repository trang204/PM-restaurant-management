import React, { useState, useEffect } from 'react'
import { apiFetch, mediaUrl } from '../../apis/base'
import './BackendManager.css'

export default function BackendManager() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [syncingFile, setSyncingFile] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await apiFetch('/admin/uploads-manager')
      setData(res)
      setError(null)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách ảnh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSyncFile = async (filename, action) => {
    try {
      setSyncingFile(filename)
      await apiFetch('/admin/uploads-manager/sync-file', {
        method: 'POST',
        body: JSON.stringify({ filename, action }),
      })
      await fetchData()
    } catch (err) {
      alert(err.message || 'Lỗi khi thực hiện đồng bộ file.')
    } finally {
      setSyncingFile(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="backend-manager-loading">
        <div className="spinner"></div>
        <p>Đang tải danh sách ảnh và cấu hình sao lưu...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="backend-manager-error">
        <h3>Đã xảy ra lỗi</h3>
        <p>{error}</p>
        <button onClick={fetchData} className="btn-retry">Thử lại</button>
      </div>
    )
  }

  // Combine items to list
  const foods = data?.foods || []
  const tables = data?.tables || []
  const users = data?.users || []
  const settings = data?.settings || []
  const others = data?.others || []

  let displayItems = []
  if (activeTab === 'all') {
    displayItems = [...foods, ...tables, ...users, ...settings, ...others]
  } else if (activeTab === 'foods') {
    displayItems = foods
  } else if (activeTab === 'tables') {
    displayItems = tables
  } else if (activeTab === 'users') {
    displayItems = users
  } else if (activeTab === 'settings') {
    displayItems = settings
  } else if (activeTab === 'others') {
    displayItems = others
  }

  // Filter search
  if (search.trim()) {
    const s = search.toLowerCase()
    displayItems = displayItems.filter(
      (item) =>
        item.filename.toLowerCase().includes(s) ||
        (item.refName && item.refName.toLowerCase().includes(s))
    )
  }

  // Count summary
  const allItems = [...foods, ...tables, ...users, ...settings, ...others]
  const totalCount = allItems.length
  const inUploadsCount = allItems.filter(x => x.inUploads).length
  const inBackupCount = allItems.filter(x => x.inBackup).length
  const mismatchCount = allItems.filter(x => !x.inUploads || !x.inBackup).length

  return (
    <div className="backend-manager-container">
      <div className="backend-manager-header">
        <div>
          <h1>Quản Lý Ảnh Backend & Sao Lưu</h1>
          <p className="subtitle">Phân loại ảnh tải lên của từng trang và đồng bộ thư mục uploads_backup</p>
        </div>
        <button className="btn-refresh" onClick={fetchData} disabled={loading}>
          {loading ? 'Đang làm mới...' : 'Làm mới danh sách'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card">
          <div className="card-value">{totalCount}</div>
          <div className="card-label">Tổng số ảnh</div>
        </div>
        <div className="card card-uploads">
          <div className="card-value">{inUploadsCount}</div>
          <div className="card-label">Ảnh trong /uploads</div>
        </div>
        <div className="card card-backup">
          <div className="card-value">{inBackupCount}</div>
          <div className="card-label">Ảnh trong /uploads_backup</div>
        </div>
        <div className="card card-mismatch">
          <div className="card-value">{mismatchCount}</div>
          <div className="card-label">Ảnh chưa đồng bộ</div>
        </div>
      </div>

      {/* Controls */}
      <div className="manager-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm theo tên file hoặc thực thể liên kết..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="tabs-list">
          <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            Tất cả ({allItems.length})
          </button>
          <button className={`tab-btn ${activeTab === 'foods' ? 'active' : ''}`} onClick={() => setActiveTab('foods')}>
            Thực đơn ({foods.length})
          </button>
          <button className={`tab-btn ${activeTab === 'tables' ? 'active' : ''}`} onClick={() => setActiveTab('tables')}>
            Bàn ăn ({tables.length})
          </button>
          <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            Người dùng ({users.length})
          </button>
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            Cài đặt ({settings.length})
          </button>
          <button className={`tab-btn ${activeTab === 'others' ? 'active' : ''}`} onClick={() => setActiveTab('others')}>
            Khác ({others.length})
          </button>
        </div>
      </div>

      {/* Grid of Items */}
      {displayItems.length === 0 ? (
        <div className="empty-state">
          <p>Không tìm thấy ảnh nào phù hợp.</p>
        </div>
      ) : (
        <div className="media-grid">
          {displayItems.map((item) => {
            const hasMismatch = !item.inUploads || !item.inBackup
            return (
              <div className={`media-card ${hasMismatch ? 'card-warning' : ''}`} key={item.filename}>
                <div className="media-preview-container">
                  {item.inUploads ? (
                    <img src={mediaUrl(item.url)} alt={item.filename} className="media-preview-img" />
                  ) : (
                    <div className="media-preview-placeholder missing">
                      <span>Ảnh bị mất ở uploads</span>
                    </div>
                  )}
                </div>

                <div className="media-details">
                  <div className="media-filename" title={item.filename}>
                    {item.filename}
                  </div>

                  <div className="media-reference">
                    {item.refName ? (
                      <span className="ref-badge">
                        Liên kết: {item.refName} {item.refId ? `(ID: ${item.refId})` : ''}
                      </span>
                    ) : item.isLogo ? (
                      <span className="ref-badge logo">Logo nhà hàng</span>
                    ) : item.isBanner ? (
                      <span className="ref-badge banner">Banner quảng cáo</span>
                    ) : (
                      <span className="ref-badge none">Chưa sử dụng trong DB</span>
                    )}
                  </div>

                  <div className="status-badges">
                    {item.inUploads ? (
                      <span className="badge badge-uploads">uploads</span>
                    ) : (
                      <span className="badge badge-missing-uploads">mất uploads</span>
                    )}

                    {item.inBackup ? (
                      <span className="badge badge-backup">backup</span>
                    ) : (
                      <span className="badge badge-no-backup">chưa backup</span>
                    )}
                  </div>

                  <div className="media-actions">
                    {!item.inUploads && item.inBackup && (
                      <button
                        className="btn-action btn-restore"
                        onClick={() => handleSyncFile(item.filename, 'restore')}
                        disabled={syncingFile === item.filename}
                      >
                        {syncingFile === item.filename ? 'Đang khôi phục...' : 'Khôi phục sang Uploads'}
                      </button>
                    )}
                    {item.inUploads && !item.inBackup && (
                      <button
                        className="btn-action btn-backup"
                        onClick={() => handleSyncFile(item.filename, 'backup')}
                        disabled={syncingFile === item.filename}
                      >
                        {syncingFile === item.filename ? 'Đang sao lưu...' : 'Sao lưu vào Backup'}
                      </button>
                    )}
                    {item.inUploads && item.inBackup && (
                      <span className="sync-ok">Đã đồng bộ an toàn</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
