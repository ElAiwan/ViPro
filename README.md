# Brudello — acceso local y Home

La entrada actual del proyecto es el portal de Brudello, completamente en alemán.
El login valida cuentas reales en un servidor local. Brudello puede crear empresas,
usuarios iniciales y abrir el Home propio de cada empresa. Las sesiones comerciales
y los catálogos siguen pendientes.

## Crear SCHRAMM u otra empresa

Desde el Home de Brudello, pulsar **Unternehmen hinzufügen**. El formulario sugiere
SCHRAMM y permite definir nombre, contacto opcional, color de marca, cupo de usuarios
y nombres/correos de los primeros usuarios. No se guarda nada hasta confirmar con
**Unternehmen erstellen**. Se puede crear una empresa sin usuarios iniciales.

Cada usuario recibe una contraseña temporal generada automáticamente, visible una
sola vez al administrador al finalizar. Puede descargarla mediante **Zugangsdaten
herunterladen**; no se envían correos reales. Si se pierde esa respuesta, usar la
recuperación de contraseña con el buzón local. Las contraseñas no se almacenan en
claro en la base. El usuario debe cambiar su clave antes de entrar al Home.

El cupo puede ser de 1 a 1000 usuarios, con hasta 50 usuarios iniciales en cada alta.
En este paso todavía no hay edición de empresas ni alta de usuarios posterior.
Brudello ve todas las empresas; un usuario empresarial solo accede a su propia
empresa. La base conserva las cuentas existentes al añadir esta función.

## Abrir el portal

Requiere Node.js 24 y las dependencias del proyecto instaladas.

```sh
npm install
npm run dev
```

Abrir **http://localhost:5173** (usar este nombre exacto, no `127.0.0.1`).
El comando inicia la interfaz y la API conjuntamente, solo en el computador local.
Para detener ambas, usar Ctrl+C. Los datos sobreviven al reinicio del servidor.

## Primer acceso

En el primer arranque se crea `admin@brudello.local`, con una contraseña temporal
aleatoria. Los datos están en [storage/private/auth/erstzugang.txt](storage/private/auth/erstzugang.txt).
La clave temporal dura 72 horas. Al ingresar se exige crear una clave de 15 a 128
caracteres, repetirla y volver a iniciar sesión. El Home está protegido también
en el servidor, no solo en la pantalla. Después del cambio, la clave inicial deja
de funcionar. No hay contraseña predeterminada incluida en el código.

## Recuperar contraseña durante las pruebas

1. Pulsar **Passwort vergessen?** e introducir el correo de la cuenta.
2. Abrir el mensaje `.txt` más reciente de `storage/private/auth/outbox/`.
3. Abrir su enlace en el navegador, elegir una nueva contraseña y volver a entrar.

No se envían correos reales todavía. Este buzón local permite probar la recuperación
sin contratar ni configurar un proveedor. Los enlaces caducan a los 30 minutos,
son de un solo uso y nunca se devuelven desde la API al solicitante.

## Comportamiento implementado

- Correo y contraseña, mostrar/ocultar contraseña, aviso de mayúsculas y validación.
- Cambio obligatorio de contraseña temporal y recuperación con confirmación.
- Cookies HttpOnly y SameSite=Strict; 8 horas de sesión normal o 14 días al elegir
  **Angemeldet bleiben**. El acceso provisional para cambiar la clave dura 15 minutos.
- Cierre de sesión y revocación de todas las sesiones al cambiar o recuperar la clave.
- Contraseñas derivadas con scrypt y sal individual; tokens guardados como hashes.
- Límites de intentos, validación de origen y cabecera de la aplicación para POST.
- Home de Brudello con listado, alta y acceso a empresas; Home por empresa con
  nombre, color, contacto y estado de preparación de catálogos y asesorías.

La base SQLite, el buzón y el acceso inicial están en `storage/private/auth/`,
fuera de `public`, bloqueados por Vite e ignorados por Git. No compartir esa carpeta.
La protección de estas copias locales también depende de la cuenta y el disco del
computador; aún no hay respaldo automatizado. El límite de intentos actual se
reinicia con el proceso. El servidor es de desarrollo local y rechaza
`NODE_ENV=production`; para publicación faltan despliegue HTTPS, proveedor de correo
y configuración operativa. La compilación de la interfaz por sí sola no despliega
la API ni la base de datos.

## Verificar

```sh
npm test
npm run build
```

`server/auth.test.mjs` prueba la API sobre bases temporales: acceso, cambio inicial,
revocación, caducidad, carreras al usar enlaces, persistencia, límites y origen.
`server/companies.test.mjs` verifica empresas, usuarios, atomicidad, cupos,
duplicados, reintentos, aislamiento y migración.
La aplicación no añade dependencias de ejecución para autenticación: usa Node y SQLite.

## Archivos del nuevo acceso

- `server/auth-store.mjs`: cuentas, contraseñas, tokens y SQLite.
- `server/http.mjs`: endpoints, cookies, protección de peticiones y límites.
- `server/index.mjs`: arranque local, primera cuenta y buzón.
- `scripts/dev.mjs`: arranque conjunto de API e interfaz.
- `src/auth/`: pantallas, formulario, Home y estilos del portal.
- `src/companies/` y `server/companies.mjs`: formulario, Home por empresa y persistencia.

Las siguientes notas corresponden al **showroom anterior**, conservado en `src/App.tsx`
y sus componentes, pero desconectado de la entrada actual del portal.

---

# SCHRAMM — Demo de catálogo interactivo anterior

Demo local pensado para presentar la idea en un iPad horizontal. Interfaz en alemán, tres ambientes, plano con cotas, visor 3D y alternativas de productos. Se inspira en las capturas de la carpeta de referencia y toma el documento Word como contexto del producto futuro.

## Abrir el demo

Se necesita Node.js 22.18 o superior y npm.

```sh
npm install
npm run dev
```

Abrir http://localhost:5173. Para verlo en un iPad, conectar ambos dispositivos a la misma red y abrir la dirección `Network` que muestra el servidor. El computador debe permanecer encendido y el servidor debe seguir abierto. La red o el cortafuegos deben permitir la conexión.

## Recorrido para una reunión

1. Elegir **Klassisch – Modern**, **Natur Pur** o **Extravagantes Design**.
2. Explorar el **Grundriss**. Los puntos con `+` seleccionan productos; las cámaras abren una perspectiva 3D.
3. Entrar a **3D erleben**, arrastrar para girar y usar el gesto de pellizco o los botones para acercar/alejar.
4. Elegir un espejo, lavabo, WC, ducha, radiador o bañera. También se pueden seleccionar desde la lista lateral.
5. Pulsar otra variante en el carrusel: cambia la forma o el material del objeto. La ficha muestra información ilustrativa en alemán.
6. Probar **Eingang**, **Waschtisch**, **Dusche** y **Draufsicht**, y volver al plano o a la selección de baños.

**Zurück** y la tecla Escape cierran primero la ficha, luego vuelven del 3D al plano y finalmente a la portada. El icono de inicio vuelve directamente a los baños. Las selecciones se mantienen por ambiente mientras la página esté abierta; recargar restablece la demo.

## Alcance y límites

- Geometrías 3D simplificadas creadas con Three.js; no son modelos arquitectónicos finales ni reflejos fotográficos.
- Las fotos de portada son las referencias de Prezi suministradas, encuadradas mediante CSS. Son inspiración visual; las escenas 3D son aproximaciones independientes.
- Tres variantes por categoría. Bañera en Natur Pur y Extravagantes Design.
- Productos, dimensiones y materiales ilustrativos, no aptos para construcción ni pedidos.
- Todo el contenido se sirve localmente, sin API, cuentas, base de datos ni recursos remotos en tiempo de ejecución.
- No incluye instalación nativa, sincronización con Nextcloud ni descarga offline persistente. Estas pertenecen al producto futuro descrito en el Word.
- El visor requiere WebGL. El comportamiento físico de gestos y rendimiento debe comprobarse en el iPad que se vaya a usar en la reunión.

## Comprobaciones

```sh
npm test
npm run build
npm run preview
```

La compilación estática se genera en `dist/`. La parte 3D se descarga al abrir el visor por primera vez. El aviso de tamaño de ese archivo corresponde al motor 3D incluido localmente.

El trabajo se verificó con pruebas de navegación/estado, comprobación de tipos, compilación de producción y respuesta HTTP del servidor. La prueba manual en un iPad físico queda pendiente.

## Organización

- `src/catalog.ts`: ambientes, datos de productos y posiciones compartidas entre 2D y 3D.
- `src/state.ts`: navegación y variantes independientes por ambiente.
- `src/components/FloorPlan.tsx`: plano arquitectónico y puntos interactivos.
- `src/components/RoomScene.tsx`: geometrías, materiales, cámaras e interacción 3D.
- `src/components/ProductPanel.tsx`: carrusel y ficha de producto.
- `src/App.tsx` y `src/styles.css`: portada, navegación y adaptación a pantalla.

### Erscheinungsbild pro Unternehmen

Brudello kann innerhalb einer Unternehmensseite über **Erscheinungsbild bearbeiten**
eine Vorlage, Farben und Schriftkombination speichern. Die Einstellungen gelten nur
für dieses Unternehmen und sind für Brudello und dessen Unternehmensbenutzer gleich.
Unternehmensbenutzer erhalten keinen Bearbeitungszugriff. Neue Unternehmen beginnen
neutral; bestehende SCHRAMM/SCHRAMM Test werden bei der Migration einmalig zugeordnet.
Details und Grenzen: [SCHRAMM-Erscheinungsbild](docs/schramm-erscheinungsbild.md).

### Eigene Anmeldeseite pro Unternehmen

Hauptzugang: `/anmelden`. E-Mail-Adresse oder Unternehmens-ID eingeben und **Weiter** wählen:
die E-Mail-Adresse eines Unternehmenskontos oder eine ID öffnet die Anmeldeseite des
Unternehmens; Brudello-Adressen führen zum Passwortschritt.
Direkter Zugang: `/portal/<code>/anmelden`; nach Login `/portal/<code>/home`.
Code und Link zeigt Brudello innerhalb der Unternehmensansicht an. Die vorhandenen
Konten und Passwörter bleiben gültig. Details: [Loginablauf](docs/company-login-flow.md).
