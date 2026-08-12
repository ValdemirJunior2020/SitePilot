import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Play,
  Power,
  Trash2
} from 'lucide-react'
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams
} from 'react-router-dom'

import Header from '../components/Header'
import Loading from '../components/Loading'
import ChangeBadge from '../components/ChangeBadge'
import StatusBadge from '../components/StatusBadge'
import SiteFormModal from '../components/SiteFormModal'
import ConfirmDialog from '../components/ConfirmDialog'

import api, { apiError } from '../services/api'
import { useToast } from '../context/ToastContext'
import {
  formatDateLong,
  hostname
} from '../utils/format'

export default function SiteDetails() {
  const { id } = useParams()
  const { openMenu } = useOutletContext()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [site, setSite] = useState(null)
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [edit, setEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function load() {
    setLoading(true)

    try {
      const [siteResponse, scansResponse] = await Promise.all([
        api.get(`/api/sites/${id}`),
        api.get(`/api/sites/${id}/scans`)
      ])

      setSite(siteResponse.data.data)
      setScans(scansResponse.data.data)
    } catch (error) {
      toast(apiError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  async function scan() {
    setScanning(true)

    toast(
      'Scan started. SitePilot is checking the website.',
      'info'
    )

    try {
      const response = await api.post(
        `/api/sites/${id}/scan`
      )

      toast(
        `Scan complete — change score ${response.data.data.changeScore}.`
      )

      await load()
    } catch (error) {
      toast(apiError(error), 'error')
    } finally {
      setScanning(false)
    }
  }

  async function save(form) {
    setSaving(true)

    try {
      await api.put(
        `/api/sites/${id}`,
        form
      )

      toast('Website updated.')
      setEdit(false)

      await load()
    } catch (error) {
      toast(apiError(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    try {
      await api.delete(
        `/api/sites/${id}`
      )

      toast('Website deleted.')

      navigate(
        '/dashboard/sites'
      )
    } catch (error) {
      toast(apiError(error), 'error')
    }
  }

  async function toggleActive() {
    try {
      await api.put(
        `/api/sites/${id}`,
        {
          active: !site.active
        }
      )

      toast(
        site.active
          ? 'Website paused.'
          : 'Website resumed.'
      )

      await load()
    } catch (error) {
      toast(apiError(error), 'error')
    }
  }

  if (loading) {
    return (
      <>
        <Header
          title="Website"
          onMenu={openMenu}
        />

        <Loading
          label="Loading website…"
        />
      </>
    )
  }

  if (!site) {
    return null
  }

  return (
    <>
      <Header
        title={site.name}
        subtitle={hostname(site.url)}
        onMenu={openMenu}
      />

      {scanning && (
        <div className="scan-loading-overlay">
          <div className="scan-loading-card">
            <img
              src="/sitepilot-loader.gif"
              alt="Scanning website"
              className="scan-loading-gif"
            />

            <div className="scan-loading-title">
              Scanning website
            </div>

            <div className="scan-loading-text">
              Checking content, status and visual changes...
            </div>

            <div className="scan-loading-subtext">
              This can take up to a minute on larger websites.
            </div>
          </div>
        </div>
      )}

      <div className="page-content">
        <Link
          to="/dashboard/sites"
          className="back-link"
        >
          <ArrowLeft size={16} />
          Back to websites
        </Link>

        <section className="site-hero panel">
          <div>
            <div className="site-title-line">
              <h2>{site.name}</h2>

              <StatusBadge
                status={site.lastStatus}
              />
            </div>

            <a
              href={site.url}
              target="_blank"
              rel="noreferrer"
            >
              {site.url}

              <ExternalLink size={14} />
            </a>

            <div className="site-facts">
              <span>
                <b>Category</b>
                {site.category}
              </span>

              <span>
                <b>Frequency</b>
                {site.frequency}
              </span>

              <span>
                <b>Last scan</b>
                {formatDateLong(
                  site.lastScanAt
                )}
              </span>

              <span>
                <b>Status code</b>
                {site.lastStatusCode || '—'}
              </span>

              <span>
                <b>Total scans</b>
                {site.totalScans || 0}
              </span>

              <span>
                <b>Total changes</b>
                {site.totalChanges || 0}
              </span>
            </div>
          </div>

          <div className="site-actions">
            <button
              className="btn btn-primary"
              onClick={scan}
              disabled={
                scanning ||
                !site.active
              }
            >
              <Play size={17} />

              {scanning
                ? 'Scanning…'
                : 'Scan Now'}
            </button>

            <a
              className="btn btn-secondary"
              href={site.url}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={17} />
              Visit
            </a>

            <button
              className="btn btn-secondary"
              onClick={() =>
                setEdit(true)
              }
            >
              <Pencil size={17} />
              Edit
            </button>

            <button
              className="btn btn-secondary"
              onClick={toggleActive}
            >
              <Power size={17} />

              {site.active
                ? 'Pause'
                : 'Resume'}
            </button>

            <button
              className="icon-btn danger"
              onClick={() =>
                setConfirm(true)
              }
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </section>

        <section className="panel history-panel">
          <div className="panel-head">
            <div>
              <h2>
                Scan history
              </h2>

              <p>
                Every saved snapshot,
                newest first
              </p>
            </div>

            {site.totalScans > 0 && (
              <ChangeBadge
                severity={
                  site.lastSeverity
                }
                score={
                  site.lastChangeScore
                }
              />
            )}
          </div>

          {!scans.length ? (
            <div className="history-empty">
              <p>
                No scans yet. Run your
                first scan to create a
                baseline.
              </p>

              <button
                className="btn btn-primary"
                onClick={scan}
                disabled={scanning}
              >
                <Play size={17} />
                Scan Now
              </button>
            </div>
          ) : (
            <div className="timeline">
              {scans.map(
                (scanItem, index) => (
                  <Link
                    to={`/dashboard/sites/${id}/scans/${scanItem.id}`}
                    className="timeline-row"
                    key={scanItem.id}
                  >
                    <div className="timeline-mark">
                      <span />
                      <i />
                    </div>

                    <div className="timeline-copy">
                      <strong>
                        {scanItem.changed
                          ? (
                              scanItem
                                .changes?.[0]
                                ?.label ||
                              'Website changed'
                            )
                          : index ===
                            scans.length - 1
                            ? 'Baseline scan'
                            : 'No significant changes'}
                      </strong>

                      <span>
                        {formatDateLong(
                          scanItem.createdAt
                        )}
                        {' · '}

                        {scanItem.duration
                          ? `${(
                              scanItem.duration /
                              1000
                            ).toFixed(
                              1
                            )}s`
                          : '—'}

                        {' · HTTP '}

                        {scanItem.statusCode ||
                          '—'}
                      </span>
                    </div>

                    <ChangeBadge
                      severity={
                        scanItem.severity
                      }
                      score={
                        scanItem.changeScore
                      }
                    />
                  </Link>
                )
              )}
            </div>
          )}
        </section>
      </div>

      <SiteFormModal
        open={edit}
        site={site}
        busy={saving}
        onClose={() =>
          setEdit(false)
        }
        onSubmit={save}
      />

      <ConfirmDialog
        open={confirm}
        title={`Delete ${site.name}?`}
        message="This permanently deletes the website and its Firestore scan history. SitePilot will also attempt to remove this website’s stored screenshots."
        confirmText="Delete website"
        danger
        onCancel={() =>
          setConfirm(false)
        }
        onConfirm={remove}
      />
    </>
  )
}