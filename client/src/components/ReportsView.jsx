import { useState, useEffect, useCallback } from 'react';
import API from '../api/axios';
import './ReportsView.css';

const formatDuration = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
};

const ReportsView = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [cleaners, setCleaners] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCleaner, setSelectedCleaner] = useState('');
  const [selectedPlace, setSelectedPlace] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch filter options (users & places)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [usersRes, placesRes] = await Promise.all([
          API.get('/users'),
          API.get('/places'),
        ]);
        setCleaners(usersRes.data.filter((u) => u.role === 'cleaner'));
        setPlaces(placesRes.data);
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };
    fetchOptions();
  }, []);

  // Fetch logs and aggregate stats
  const fetchReportsData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCleaner) params.cleanerId = selectedCleaner;
      if (selectedPlace) params.placeId = selectedPlace;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [logsRes, statsRes] = await Promise.all([
        API.get('/cleaning-logs', { params }),
        API.get('/cleaning-logs/stats', { params }),
      ]);

      setLogs(logsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error loading cleaning reports:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCleaner, selectedPlace, startDate, endDate]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // Quick Date Preset helpers
  const applyDatePreset = (preset) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const pastWeek = new Date(today);
      pastWeek.setDate(pastWeek.getDate() - 7);
      setStartDate(pastWeek.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const pastMonth = new Date(today);
      pastMonth.setDate(pastMonth.getDate() - 30);
      setStartDate(pastMonth.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!logs.length) return;

    const headers = [
      'Log ID',
      'Date',
      'Cleaner Name',
      'Cleaner Email',
      'Cleaning Place',
      'Place Address',
      'Start Time',
      'End Time',
      'Exact Duration',
      'Exact Duration (Seconds)',
      'Extra Duration (Overtime)',
      'Extra Duration (Seconds)',
      'Total Rounded Hours (Billed/Payroll)',
      'Completed Tasks Count',
      'Vicinity Verified (GPS)',
    ];

    const rows = logs.map((log) => [
      log._id,
      new Date(log.startedAt).toLocaleDateString(),
      log.cleaner?.name || 'Unknown',
      log.cleaner?.email || '',
      log.place?.name || log.placeSnapshot?.name || 'Unknown',
      `"${(log.place?.address || log.placeSnapshot?.address || '').replace(/"/g, '""')}"`,
      new Date(log.startedAt).toLocaleTimeString(),
      new Date(log.completedAt).toLocaleTimeString(),
      log.exactDurationFormatted || formatDuration(log.exactDurationSeconds),
      log.exactDurationSeconds,
      log.extraDurationFormatted || formatDuration(log.extraDurationSeconds),
      log.extraDurationSeconds,
      log.roundedDurationHours,
      log.completedTasks?.length || 0,
      log.verifiedVicinity ? 'YES' : 'NO',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `NCLEAN_Cleaning_Report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="reports-container">
      {/* ── Filter Toolbar ── */}
      <div className="reports-filter-bar">
        {/* Filter by Cleaner */}
        <div className="reports-filter-item">
          <label className="reports-filter-label">Filter by Cleaner</label>
          <select
            className="modal-select"
            value={selectedCleaner}
            onChange={(e) => setSelectedCleaner(e.target.value)}
          >
            <option value="">All Cleaners</option>
            {cleaners.map((c) => (
              <option key={c._id} value={c._id}>
                🧹 {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Cleaning Place */}
        <div className="reports-filter-item">
          <label className="reports-filter-label">Filter by Cleaning Place</label>
          <select
            className="modal-select"
            value={selectedPlace}
            onChange={(e) => setSelectedPlace(e.target.value)}
          >
            <option value="">All Places</option>
            {places.map((p) => (
              <option key={p._id} value={p._id}>
                🏢 {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div className="reports-filter-item">
          <label className="reports-filter-label">From Date</label>
          <input
            type="date"
            className="modal-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {/* End Date */}
        <div className="reports-filter-item">
          <label className="reports-filter-label">To Date</label>
          <input
            type="date"
            className="modal-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Quick Presets & Clear */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-reset-status"
            style={{ padding: '7px 10px', fontSize: 11.5 }}
            onClick={() => applyDatePreset('today')}
          >
            Today
          </button>
          <button
            type="button"
            className="btn-reset-status"
            style={{ padding: '7px 10px', fontSize: 11.5 }}
            onClick={() => applyDatePreset('week')}
          >
            7 Days
          </button>
          <button
            type="button"
            className="btn-reset-status"
            style={{ padding: '7px 10px', fontSize: 11.5 }}
            onClick={() => applyDatePreset('month')}
          >
            30 Days
          </button>
          <button
            type="button"
            className="btn-reset-status"
            style={{ padding: '7px 10px', fontSize: 11.5, color: '#fca5a5' }}
            onClick={() => {
              setSelectedCleaner('');
              setSelectedPlace('');
              applyDatePreset('all');
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="reports-kpis-grid">
        <div className="report-kpi-card">
          <div
            className="report-kpi-icon"
            style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}
          >
            📋
          </div>
          <div>
            <div className="report-kpi-val">{stats?.totalSessions ?? 0}</div>
            <div className="report-kpi-label">Completed Sessions</div>
          </div>
        </div>

        <div className="report-kpi-card">
          <div
            className="report-kpi-icon"
            style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}
          >
            ⏱️
          </div>
          <div>
            <div className="report-kpi-val">
              {stats?.totalExactDurationFormatted || '0s'}
            </div>
            <div className="report-kpi-label">Total Exact Duration</div>
          </div>
        </div>

        <div className="report-kpi-card">
          <div
            className="report-kpi-icon"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
          >
            ⏳
          </div>
          <div>
            <div
              className="report-kpi-val"
              style={{ color: stats?.totalExtraSeconds > 0 ? '#f87171' : '#34d399' }}
            >
              {stats?.totalExtraDurationFormatted || '0s'}
            </div>
            <div className="report-kpi-label">Total Extra (Overtime)</div>
          </div>
        </div>

        <div className="report-kpi-card">
          <div
            className="report-kpi-icon"
            style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}
          >
            🕒
          </div>
          <div>
            <div className="report-kpi-val" style={{ color: '#34d399' }}>
              {stats?.totalRoundedHours ?? 0} Hrs
            </div>
            <div className="report-kpi-label">Total Rounded Hours (Billing/Payroll)</div>
          </div>
        </div>
      </div>

      {/* ── Detailed Reports Data Table ── */}
      <div className="reports-table-panel">
        <div className="reports-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="reports-table-title">Cleaning Activity Records</span>
            <span className="reports-table-count">{logs.length} records</span>
          </div>

          <button
            type="button"
            className="btn-export-csv"
            onClick={handleExportCSV}
            disabled={logs.length === 0}
          >
            <span>📥</span> Export CSV Report
          </button>
        </div>

        <div className="reports-table-responsive">
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 10 }} />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                No Cleaning Records Found
              </div>
              <div style={{ fontSize: 13 }}>
                Adjust your filters above or check back once cleaners finish assignments.
              </div>
            </div>
          ) : (
            <table className="reports-data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Cleaner</th>
                  <th>Cleaning Place</th>
                  <th>Tasks Done</th>
                  <th>Exact Duration</th>
                  <th>Extra (Overtime)</th>
                  <th>Rounded Hours</th>
                  <th>Vicinity GPS</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const placeName = log.place?.name || log.placeSnapshot?.name || 'Place';
                  const placeAddress = log.place?.address || log.placeSnapshot?.address || '';
                  const cleanerName = log.cleaner?.name || 'Cleaner';
                  const dateStr = new Date(log.startedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const timeRangeStr = `${new Date(log.startedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })} - ${new Date(log.completedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`;

                  return (
                    <tr key={log._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{dateStr}</div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                          {timeRangeStr}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#93c5fd' }}>
                          🧹 {cleanerName}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {log.cleaner?.email || ''}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{placeName}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#64748b',
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={placeAddress}
                        >
                          📍 {placeAddress}
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            background: 'rgba(168, 85, 247, 0.12)',
                            color: '#c084fc',
                            border: '1px solid rgba(168, 85, 247, 0.25)',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          ✅ {log.completedTasks?.length || 0} subtasks
                        </span>
                      </td>

                      <td>
                        <span className="tag-exact-time">
                          ⏱️ {log.exactDurationFormatted || formatDuration(log.exactDurationSeconds)}
                        </span>
                      </td>

                      <td>
                        {log.extraDurationSeconds > 0 ? (
                          <span className="tag-extra-time">
                            +{log.extraDurationFormatted || formatDuration(log.extraDurationSeconds)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>
                            ✓ On Time
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="tag-rounded-hours">
                          🕒 {log.roundedDurationHours} hr{log.roundedDurationHours > 1 ? 's' : ''}
                        </span>
                      </td>

                      <td>
                        {log.verifiedVicinity ? (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: '#34d399',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>✅</span> Verified
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: '#94a3b8',
                            }}
                          >
                            Off / Direct
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
