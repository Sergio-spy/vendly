import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { outboxList, outboxRemove, onOutboxChange } from '../lib/db';
import { drainOutbox, retryOutboxEntry } from '../lib/sync';
import { useOnline } from '../lib/online';
import { eur } from '../lib/format';

const STATUS_LABEL = {
  pending:  { label: 'Pendiente',     tag: 'tag-warn' },
  syncing:  { label: 'Subiendo…',     tag: 'tag-info' },
  synced:   { label: 'Subido a Odoo', tag: 'tag-success' },
  error:    { label: 'Error',         tag: 'tag-danger' },
};

function fmtTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

export function OutboxModal({ open, onClose, clients = [] }) {
  const online = useOnline();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    const refresh = async () => {
      try {
        const all = await outboxList();
        if (!cancel) setEntries(all.sort((a, b) => b.createdAt - a.createdAt));
      } catch {}
    };
    refresh();
    const off = onOutboxChange(refresh);
    return () => { cancel = true; off(); };
  }, [open]);

  if (!open) return null;

  const partnerName = (id) => {
    const c = clients.find(x => x.odooId === id);
    return c?.name || `Cliente #${id}`;
  };
  const lineCount = (e) => e.payload?.lines?.length || 0;

  const onRetryAll = async () => {
    setLoading(true);
    try { await drainOutbox(); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="modal" style={{ width: 720, maxHeight: '85vh' }}>
        <div className="hstack" style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div className="t-tiny">PEDIDOS</div>
            <div className="t-h1">Pendientes de subir</div>
            <div className="t-small">{online ? 'Conexión OK · subimos automáticamente' : 'Sin conexión · esperando red'}</div>
          </div>
          <div className="spacer"/>
          <button className="btn btn-secondary btn-sm" disabled={!online || loading} onClick={onRetryAll}>
            <Icon name="sync" size={14}/> Reintentar todos
          </button>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x"/></button>
        </div>

        <div className="drawer-body">
          {entries.length === 0 ? (
            <div className="empty">
              <div className="empty-ic"><Icon name="check" size={24}/></div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay pedidos pendientes</div>
              <div className="t-small">Todo subido a Odoo.</div>
            </div>
          ) : (
            <div className="vstack" style={{ gap: 8 }}>
              {entries.map(e => {
                const s = STATUS_LABEL[e.status] || STATUS_LABEL.pending;
                return (
                  <div key={e.id} className="card" style={{ padding: 12 }}>
                    <div className="hstack" style={{ marginBottom: 6 }}>
                      <div style={{ fontWeight: 600 }}>
                        {e.mode === 'update' ? 'Edición de pedido' : 'Nuevo pedido'} · {partnerName(e.payload?.partnerId)}
                      </div>
                      <div className="spacer"/>
                      <span className={`tag ${s.tag}`}>{s.label}</span>
                    </div>
                    <div className="t-small muted">
                      {lineCount(e)} línea{lineCount(e) !== 1 ? 's' : ''} · creado {fmtTime(e.createdAt)}
                      {e.syncedAt && <> · subido {fmtTime(e.syncedAt)}</>}
                      {e.syncedOrderName && <> · <span className="tabular">{e.syncedOrderName}</span></>}
                    </div>
                    {e.status === 'error' && e.error && (
                      <div className="t-small" style={{ color:'var(--danger)', marginTop: 6 }}>
                        ⚠ {e.error}
                      </div>
                    )}
                    <div className="hstack" style={{ gap: 6, marginTop: 8 }}>
                      {e.status === 'error' && (
                        <button className="btn btn-secondary btn-sm" disabled={!online} onClick={() => retryOutboxEntry(e.id)}>
                          <Icon name="sync" size={12}/> Reintentar
                        </button>
                      )}
                      {(e.status === 'error' || e.status === 'synced') && (
                        <button className="btn btn-ghost btn-sm" onClick={() => outboxRemove(e.id)} title="Eliminar de la cola local">
                          <Icon name="trash" size={12}/> Quitar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="drawer-foot hstack">
          <div className="muted t-small">{entries.length} entrada{entries.length !== 1 ? 's' : ''} en total</div>
          <div className="spacer"/>
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </>
  );
}
