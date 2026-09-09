# SCHRAMM — Demo de catálogo interactivo

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
