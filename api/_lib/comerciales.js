// Tabla de comerciales (vive fuera de Odoo para no consumir licencias).
//
// Cada comercial tiene:
//   id          — identificador interno
//   login       — usuario para login
//   passwordHash — generado con `node scripts/hash-password.js "tu-password"`
//   name        — nombre completo (mostrado en sidebar)
//   firstName   — nombre corto (mostrado en saludo del dashboard)
//   initials    — iniciales para el avatar
//   zone        — zona / equipo, texto libre
//   odooTagId   — ID en Odoo de la etiqueta de cliente "Comercial - X"
//                 (mira /api/tags estando logueado para ver tus IDs)
//
// Para añadir un comercial: copia el bloque, cambia los datos, regenera el hash.
// Para resetear password: regenera el hash con el script y pega el nuevo valor.

export const COMERCIALES = [
  {
    id: 'sergio',
    login: 'sergio',
    // Password: "vendly2026"  (cuenta admin, sin etiqueta → ve TODOS los clientes)
    passwordHash: 'be4d701c45181fd6f884b831ea709323:efc705aed7898aec69500dac10c8c34d464e56af32ae19dbbd8e8647895a7d74bf4b26971d7d850dec6cd014c431683ef43e1c62168626637df9743a22bc7a03',
    name: 'Sergio Girbés',
    firstName: 'Sergio',
    initials: 'SG',
    zone: 'Admin',
    email: 'sergio@palomatic-sl.com',
    odooTagId: null, // null → ve todos los clientes (admin)
  },
  {
    id: 'german',
    login: 'german',
    // Password: "1234"
    passwordHash: 'a009e20ee1c9838fd14146e88af81948:4f8a4ab0e2c6c1fd35443bf170230c5f54834d86b0105820a4352a4fb8998e122ac29771ffe24234b6674f456712e0cd4a4b82ddd8dc18eb8e4e306aca60516b',
    name: 'German Masip',
    firstName: 'German',
    initials: 'GM',
    zone: 'Comercial',
    email: 'gmasip@palomatic-sl.com',
    odooTagId: 35, // Etiqueta "Comercial - German Masip"
  },
  {
    id: 'josep',
    login: 'josep',
    // Password: "1234"
    passwordHash: 'a009e20ee1c9838fd14146e88af81948:4f8a4ab0e2c6c1fd35443bf170230c5f54834d86b0105820a4352a4fb8998e122ac29771ffe24234b6674f456712e0cd4a4b82ddd8dc18eb8e4e306aca60516b',
    name: 'Josep Lopez',
    firstName: 'Josep',
    initials: 'JL',
    zone: 'Comercial',
    email: 'jlopez@palomatic-sl.com',
    odooTagId: 36, // Etiqueta "Comercial - Josep Lopez"
  },
];
