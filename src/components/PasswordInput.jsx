import { useState } from 'react';
import { Icon } from './Icon';

// Input de contraseña con ojo para alternar visibilidad. Hereda className y
// props del <input> normal; el contenedor es relative para colocar el botón.
export function PasswordInput({ className = 'input', ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        className={className}
        style={{ ...inputProps.style, paddingRight: 40, width: '100%' }}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          color: visible ? 'var(--brand-700)' : 'var(--ink-3)',
          display: 'flex',
        }}
      >
        <Icon name="eye" size={18}/>
      </button>
    </div>
  );
}
