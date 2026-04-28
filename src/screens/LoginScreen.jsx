import { useState } from 'react';

export function LoginScreen({ onLogin }) {
  const [user, setUser] = useState('aribera');
  const [pass, setPass] = useState('••••••••');
  return (
    <div style={{ height:'100%', display:'grid', gridTemplateColumns:'1fr 1fr', background:'var(--bg)' }}>
      <div style={{ padding:'56px 64px', display:'flex', flexDirection:'column', justifyContent:'center', maxWidth: 480 }}>
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

        <div className="vstack" style={{ gap: 14, marginBottom: 24 }}>
          <div className="field">
            <label>Usuario</label>
            <input className="input lg" value={user} onChange={e=>setUser(e.target.value)} />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input className="input lg" type="password" value={pass} onChange={e=>setPass(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary btn-lg" style={{ width:'100%' }} onClick={onLogin}>
          Entrar
        </button>
        <div className="t-small" style={{ marginTop: 18, textAlign:'center' }}>
          ¿Sin conexión? Puedes seguir trabajando con tu última caché de catálogo.
        </div>
      </div>

      <div style={{ background:'linear-gradient(135deg, var(--brand-700), var(--brand-500))', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset: 0, opacity: 0.15, backgroundImage:'radial-gradient(circle at 30% 20%, white 1px, transparent 2px), radial-gradient(circle at 70% 60%, white 1px, transparent 2px)', backgroundSize:'40px 40px' }}/>
        <div style={{ position:'absolute', bottom: 56, left: 56, right: 56, color:'white' }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing:'0.08em', textTransform:'uppercase', opacity:.8, marginBottom: 12 }}>Hoy en tu zona</div>
          <div style={{ fontSize: 38, fontWeight: 600, letterSpacing:'-0.02em', lineHeight: 1.15, marginBottom: 28, textWrap:'balance' }}>
            5 visitas planificadas, 2 cobros pendientes, 4 promociones activas.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 14 }}>
            {[
              { v:'32.420 €', l:'Venta del mes' },
              { v:'72%',      l:'del objetivo' },
              { v:'124',      l:'artículos en catálogo' },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,.12)', borderRadius: 12, padding: 14, backdropFilter:'blur(6px)' }}>
                <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{s.v}</div>
                <div style={{ fontSize: 12, opacity:.85 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
