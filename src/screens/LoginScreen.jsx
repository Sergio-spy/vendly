import { useState } from 'react';
import { api, auth } from '../api';
import { PasswordInput } from '../components/PasswordInput';

export function LoginScreen({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const { token, comercial } = await api.login(user, pass);
      auth.setToken(token);
      onLogin(comercial);
    } catch (ex) {
      setErr(ex.message || 'Error de autenticación');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="login-grid" style={{ height:'100%', display:'grid', gridTemplateColumns:'1fr 1fr', background:'var(--bg)' }}>
      <div className="login-form" style={{ padding:'56px 64px', display:'flex', flexDirection:'column', justifyContent:'center', maxWidth: 480 }}>
        <div className="hstack" style={{ marginBottom: 40 }}>
          <div className="sb-logo" style={{ width: 44, height: 44, borderRadius: 12, fontSize: 22 }}>V</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Vendly</div>
            <div className="t-small">Venta comercial · Odoo</div>
          </div>
        </div>
        <div className="t-display" style={{ marginBottom: 8 }}>Bienvenido,<br/>comercial.</div>
        <div className="muted" style={{ fontSize: 15, marginBottom: 36, maxWidth: 380 }}>
          Inicia sesión con tu usuario asignado por administración.
        </div>

        <div className="vstack" style={{ gap: 14, marginBottom: 18 }}>
          <div className="field">
            <label>Usuario</label>
            <input className="input lg" value={user} onChange={e=>setUser(e.target.value)} autoFocus required disabled={busy} autoComplete="username" name="username" inputMode="text" autoCapitalize="none" autoCorrect="off" spellCheck={false}/>
          </div>
          <div className="field">
            <label>Contraseña</label>
            <PasswordInput className="input lg" value={pass} onChange={e=>setPass(e.target.value)} required disabled={busy} autoComplete="current-password" name="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false}/>
          </div>
        </div>
        {err && (
          <div style={{ background:'var(--danger-bg)', color:'var(--danger)', padding:'10px 14px', borderRadius:'var(--r-2)', fontSize: 13, marginBottom: 14 }}>
            {err}
          </div>
        )}
        <button className="btn btn-primary btn-lg" style={{ width:'100%' }} type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <div className="t-small" style={{ marginTop: 18, textAlign:'center' }}>
          ¿Sin conexión? Puedes seguir trabajando con tu última caché de catálogo.
        </div>
      </div>

      <div className="login-brand" style={{ background:'linear-gradient(135deg, var(--brand-700), var(--brand-500))', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', justifyContent:'space-between', padding: 56, color:'white' }}>
        <div style={{ position:'absolute', inset: 0, opacity: 0.12, backgroundImage:'radial-gradient(circle at 30% 20%, white 1px, transparent 2px), radial-gradient(circle at 70% 60%, white 1px, transparent 2px)', backgroundSize:'40px 40px', pointerEvents:'none' }}/>

        {/* Logo arriba */}
        <div style={{ position:'relative' }}>
          <img src="/palomatic-white.png" alt="Palomatic" style={{ height: 44, width:'auto', display:'block' }}/>
        </div>

        {/* Mensaje principal abajo */}
        <div style={{ position:'relative' }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing:'0.12em', textTransform:'uppercase', opacity:.85, marginBottom: 14 }}>
            Aluminio que dura
          </div>
          <div className="login-brand-headline" style={{ fontSize: 36, fontWeight: 600, letterSpacing:'-0.02em', lineHeight: 1.2, marginBottom: 28, textWrap:'balance', maxWidth: 420 }}>
            Diseñamos y fabricamos palos y mangos para escobas, fregonas y recogedores.
          </div>
          <div className="hstack" style={{ gap: 10, flexWrap:'wrap' }}>
            {['Anodizado', 'ECO', 'PRO'].map(t => (
              <span key={t} style={{
                background:'rgba(255,255,255,.14)',
                border:'1px solid rgba(255,255,255,.2)',
                padding:'6px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.02em',
                backdropFilter:'blur(6px)',
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
