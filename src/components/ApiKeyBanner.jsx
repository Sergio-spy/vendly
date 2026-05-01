import { Icon } from './Icon';

// Banner de aviso sobre el estado de la API Key de Odoo.
// - Rojo si Odoo rechaza la auth (odooAuth='fail')
// - Ámbar si quedan ≤14 días para que caduque (apiKeyDaysLeft)
// Se muestra siempre que aplique; el comercial sabe a quién contactar.
export function ApiKeyBanner({ health, isAdmin = false }) {
  if (!health) return null;
  const { mode, odooAuth, apiKeyDaysLeft } = health;
  if (mode !== 'odoo') return null;

  const failed = odooAuth === 'fail';
  const expiringSoon = !failed && apiKeyDaysLeft != null && apiKeyDaysLeft <= 14;
  if (!failed && !expiringSoon) return null;

  const isError = failed;
  const message = failed
    ? 'La conexión con Odoo está caída. Es posible que la API Key haya caducado o se haya revocado. Contacta con el administrador para renovarla.'
    : apiKeyDaysLeft <= 0
      ? `La API Key de Odoo caducó${apiKeyDaysLeft < 0 ? ` hace ${-apiKeyDaysLeft} días` : ' hoy'}. Avisa al administrador para renovarla.`
      : `La API Key de Odoo caduca en ${apiKeyDaysLeft} día${apiKeyDaysLeft === 1 ? '' : 's'}. Avisa al administrador para renovarla.`;

  const palette = isError
    ? { bg: 'var(--danger-bg)', fg: 'var(--danger)', border: '#f3b3b3' }
    : { bg: 'var(--warn-bg)',   fg: 'var(--warn)',   border: '#f1d4a0' };

  return (
    <div
      role="alert"
      style={{
        background: palette.bg,
        color: palette.fg,
        borderBottom: `1px solid ${palette.border}`,
        padding: '10px 22px',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 13.5, fontWeight: 500,
        flexShrink: 0,
      }}
    >
      <Icon name={isError ? 'wifi-off' : 'bell'} size={16}/>
      <span style={{ flex: 1 }}>{message}</span>
      {isAdmin && health.apiKeyExpiresAt && (
        <span style={{ fontSize: 12, opacity: 0.85 }}>Caducidad: {health.apiKeyExpiresAt}</span>
      )}
    </div>
  );
}
