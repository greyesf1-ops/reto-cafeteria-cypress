# Reto: aplicación web de pedidos con Cypress

Aplicación de extremo a extremo para **Café Brújula**. Permite consultar productos, agregar artículos, modificar cantidades, validar carrito vacío, confirmar una orden y consultar el pedido persistido.

**Estudiante:** Georgean Edilzr Reyes Flores  
**Carné:** 27902220861

## Arquitectura

- `public/`: frontend accesible en HTML, CSS y JavaScript sin dependencia de terceros.
- `server.js`: API Express con productos, órdenes, validaciones y persistencia en `data/orders.json`.
- `cypress/e2e/pedidos.cy.ts`: tres recorridos E2E obligatorios en TypeScript.
- `.github/workflows/ci.yml`: instala dependencias, arranca la aplicación y ejecuta Cypress en CI.

## Ejecución

```bash
npm ci
npm run start
```

Abre `http://localhost:4173`. Para ejecutar la suite completa en otra terminal:

```bash
npm run cy:run
```

También puede ejecutarse todo con `npm run test:e2e`; `start-server-and-test` inicia el servidor, espera `baseUrl` y luego ejecuta Cypress.

## Estrategia de datos y flakiness

Cada prueba llama `POST /api/test/reset` desde `cypress/support/e2e.ts`. El endpoint solo está disponible cuando `NODE_ENV=test` o `TEST_MODE=1`, restaura los productos semilla y elimina las órdenes anteriores. Las pruebas no usan esperas numéricas: esperan alias de red, elementos visibles y respuestas HTTP. La orden exitosa se verifica nuevamente mediante `GET /api/orders/:id`.

## Recorridos cubiertos

1. Camino exitoso: agrega espresso y croissant, confirma, verifica el alias `@createOrder`, el identificador, el total y la persistencia.
2. Validación: intenta confirmar el carrito vacío y comprueba que `POST /api/orders` no se envía.
3. Fallo controlado: `cy.intercept()` devuelve 503 para la confirmación, se muestra el mensaje y el carrito sigue disponible para recuperación.

## Herramientas y uso de IA

La suite se implementó con Cypress + TypeScript porque el reto exige esa herramienta. Se usó IA para proponer recorridos, revisar selectores y detectar condiciones de espera; las aserciones finales son deterministas y fueron revisadas sobre la aplicación real. No se incluyen secretos ni servicios externos.

Playwright sería una buena elección cuando se necesite el mismo flujo en varios motores de navegador, contextos aislados o trazas detalladas. Agent Browser puede ser útil para explorar una aplicación o revisar cambios de forma interactiva. Para esta entrega se mantuvo Cypress porque el reto lo solicita y porque permite repetir los recorridos, observar la red y conservar evidencia en CI.

## CI y evidencia

El workflow `Cypress E2E` conserva videos y capturas cuando se ejecuta en GitHub Actions. En una entrega pública, agregue al README el enlace del repositorio y el enlace de la ejecución exitosa; el proyecto está preparado para ambos enlaces.
