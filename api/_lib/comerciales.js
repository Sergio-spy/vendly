// Tabla de comerciales (vive fuera de Odoo para no consumir licencias).
//
// Cada comercial tiene:
//   id          — identificador interno
//   login       — usuario para login (recomiendo email)
//   passwordHash — generado con `node scripts/hash-password.js "tu-password"`
//   name        — nombre completo (mostrado en sidebar)
//   firstName   — nombre corto (mostrado en saludo del dashboard)
//   initials    — iniciales para el avatar
//   zone        — zona / equipo, texto libre
//   odooTagId   — ID en Odoo de la etiqueta de cliente "Comercial · X"
//                 (mira /api/tags estando logueado para ver tus IDs)
//
// Para añadir un comercial: copia el bloque, cambia los datos, regenera el hash.
// Para resetear password: regenera el hash con el script y pega el nuevo valor.

export const COMERCIALES = [
  {
    id: 'sergio',
    login: 'sergio',
    // Password de demo: "vendly2026"  (cámbialo en cuanto puedas)
    passwordHash: 'be4d701c45181fd6f884b831ea709323:efc705aed7898aec69500dac10c8c34d464e56af32ae19dbbd8e8647895a7d74bf4b26971d7d850dec6cd014c431683ef43e1c62168626637df9743a22bc7a03',
    name: 'Sergio Girbés',
    firstName: 'Sergio',
    initials: 'SG',
    zone: 'Levante',
    email: 'sergio@palomatic-sl.com',
    odooTagId: null, // ← Pon aquí el ID de la etiqueta cuando la crees en Odoo. Mientras sea null, ve TODOS los clientes (modo admin).
  },
];
