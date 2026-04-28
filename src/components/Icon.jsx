export function Icon({ name, size = 18, stroke = 1.6, style = {}, className = '' }) {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    style, className,
  };
  switch (name) {
    case 'home':       return <svg {...props}><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>;
    case 'catalog':    return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
    case 'cart':       return <svg {...props}><path d="M3 4h2l2.5 12h11l2-9H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>;
    case 'orders':     return <svg {...props}><path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>;
    case 'clients':    return <svg {...props}><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M21 19c0-2.4-1.7-4-4-4"/></svg>;
    case 'tariffs':    return <svg {...props}><path d="M20 12l-8 8-9-9V3h8z"/><circle cx="8" cy="8" r="1.5"/></svg>;
    case 'promo':      return <svg {...props}><path d="M3 12l9-9 9 9-9 9z"/><circle cx="9" cy="9" r="1.4"/><path d="M9 15l6-6"/></svg>;
    case 'stock':      return <svg {...props}><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/></svg>;
    case 'collect':    return <svg {...props}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="15" r="1.2"/></svg>;
    case 'kpi':        return <svg {...props}><path d="M4 20V8M10 20V4M16 20v-8M22 20H2"/></svg>;
    case 'admin':      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>;
    case 'search':     return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case 'plus':       return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'minus':      return <svg {...props}><path d="M5 12h14"/></svg>;
    case 'check':      return <svg {...props}><path d="M5 12l4 4 10-10"/></svg>;
    case 'x':          return <svg {...props}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'chev-right': return <svg {...props}><path d="M9 6l6 6-6 6"/></svg>;
    case 'chev-down':  return <svg {...props}><path d="M6 9l6 6 6-6"/></svg>;
    case 'chev-up':    return <svg {...props}><path d="M6 15l6-6 6 6"/></svg>;
    case 'filter':     return <svg {...props}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case 'grid':       return <svg {...props}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case 'list':       return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case 'wifi-off':   return <svg {...props}><path d="M2 2l20 20"/><path d="M5 13a10 10 0 0 1 5-2.6M16.7 11.6A10 10 0 0 1 19 13M9 16.5a5 5 0 0 1 6 0"/></svg>;
    case 'cloud':      return <svg {...props}><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1A4.5 4.5 0 0 1 17 18z"/></svg>;
    case 'sync':       return <svg {...props}><path d="M21 12a9 9 0 0 1-15.5 6.3M3 12a9 9 0 0 1 15.5-6.3"/><path d="M21 4v5h-5M3 20v-5h5"/></svg>;
    case 'star':       return <svg {...props}><path d="M12 3l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 17.3 6.2 20.6l1.5-6.5-5-4.4 6.6-.6z"/></svg>;
    case 'heart':      return <svg {...props}><path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10z"/></svg>;
    case 'trash':      return <svg {...props}><path d="M4 7h16M9 7V4h6v3M6 7v13h12V7"/></svg>;
    case 'edit':       return <svg {...props}><path d="M14 4l6 6L8 22H2v-6z"/></svg>;
    case 'arrow-left': return <svg {...props}><path d="M19 12H5M11 5l-6 7 6 7"/></svg>;
    case 'arrow-up':   return <svg {...props}><path d="M12 19V5M5 11l7-6 7 6"/></svg>;
    case 'arrow-down': return <svg {...props}><path d="M12 5v14M5 13l7 6 7-6"/></svg>;
    case 'logout':     return <svg {...props}><path d="M9 21H4V3h5M16 16l5-4-5-4M21 12H10"/></svg>;
    case 'bell':       return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0v4l2 3H4l2-3z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>;
    case 'phone':      return <svg {...props}><path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>;
    case 'pin':        return <svg {...props}><path d="M12 22s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>;
    case 'menu':       return <svg {...props}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case 'eye':        return <svg {...props}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'percent':    return <svg {...props}><circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><path d="M5 19L19 5"/></svg>;
    case 'box':        return <svg {...props}><path d="M3 7l9 5 9-5M3 7l9-4 9 4v10l-9 4-9-4z"/></svg>;
    case 'truck':      return <svg {...props}><rect x="2" y="7" width="13" height="10"/><path d="M15 11h5l2 3v3h-7"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>;
    case 'doc':        return <svg {...props}><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/></svg>;
    default:           return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

export function ProdGlyph({ kind = 'bottle', size = 60, color = '#5a6469' }) {
  const s = { width: size, height: size, color };
  switch (kind) {
    case 'bottle': return (
      <svg {...s} viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="22" y="6" width="16" height="6" rx="1"/>
        <path d="M22 12c0 4-6 7-6 13v25a4 4 0 0 0 4 4h20a4 4 0 0 0 4-4V25c0-6-6-9-6-13"/>
        <rect x="18" y="28" width="24" height="10" fill="white"/>
      </svg>);
    case 'spray': return (
      <svg {...s} viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 14h12v6H16zM12 20h20l-2 6v22a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4V26z"/>
        <path d="M28 17h6l4-4M38 13l3-2M42 9l2-1"/>
      </svg>);
    case 'jug': return (
      <svg {...s} viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 14h26v8M14 22v28a4 4 0 0 0 4 4h22a4 4 0 0 0 4-4V22z"/>
        <path d="M40 22h6a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-2"/>
        <rect x="18" y="32" width="20" height="10" fill="white"/>
      </svg>);
    case 'roll': return (
      <svg {...s} viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.4">
        <ellipse cx="30" cy="14" rx="20" ry="6"/>
        <path d="M10 14v32c0 3.3 9 6 20 6s20-2.7 20-6V14"/>
        <ellipse cx="30" cy="14" rx="8" ry="2.5"/>
      </svg>);
    case 'box': return (
      <svg {...s} viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M8 18l22-10 22 10v26L30 54 8 44z"/>
        <path d="M8 18l22 10 22-10M30 28v26"/>
      </svg>);
    case 'bag': return (
      <svg {...s} viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M14 18h32l-3 34a4 4 0 0 1-4 4H21a4 4 0 0 1-4-4z"/>
        <path d="M22 18a8 8 0 0 1 16 0"/>
      </svg>);
    case 'mop': return (
      <svg {...s} viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M30 4v34"/><path d="M14 38h32l-2 8H16z"/>
        <path d="M16 46l-4 10M22 46l-1 10M30 46v10M38 46l1 10M44 46l4 10"/>
      </svg>);
    case 'bucket': return (
      <svg {...s} viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M12 18h36l-4 32a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4z"/>
        <path d="M14 14a16 8 0 0 1 32 0"/>
      </svg>);
    case 'cloth': return (
      <svg {...s} viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M10 14l40 6-4 36L6 50z"/><path d="M14 22l32 4M12 30l34 4M10 38l34 4"/>
      </svg>);
    case 'glove': return (
      <svg {...s} viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M16 30V12a3 3 0 0 1 6 0v14M22 26V8a3 3 0 0 1 6 0v18M28 26V10a3 3 0 0 1 6 0v18M34 26v-4a3 3 0 0 1 6 0v18l-4 14H16l-4-14v-4a3 3 0 0 1 6 0"/>
      </svg>);
    default: return <Icon name="box" size={size}/>;
  }
}
