describe('Pedidos de Café Brújula', () => {
  it('completa el camino exitoso y verifica la orden persistida', () => {
    cy.intercept('POST', '/api/orders').as('createOrder');
    cy.visit('/');
    cy.get('[data-cy="product-espresso"]').find('[data-add]').click();
    cy.get('[data-cy="product-croissant"]').find('[data-add]').click();
    cy.get('[data-cy="cart-item-espresso"]').should('contain', '1');
    cy.get('[data-cy="cart-item-croissant"]').should('contain', '1');
    cy.get('[data-cy="confirm-order"]').click();
    cy.wait('@createOrder').its('response.statusCode').should('eq', 201);
    cy.get('#success-panel').should('be.visible').and('contain', 'PEDIDO CONFIRMADO');
    cy.screenshot('01-camino-exitoso-confirmado');
    cy.get('#order-id').invoke('text').then((orderId) => {
      expect(orderId).to.match(/^CAF-/);
      cy.request(`/api/orders/${orderId}`).its('body').should((order) => {
        expect(order.status).to.equal('Confirmado');
        expect(order.total).to.equal(42);
      });
    });
  });

  it('rechaza confirmar un pedido vacío sin enviar la operación', () => {
    cy.intercept('POST', '/api/orders').as('createOrder');
    cy.visit('/');
    cy.get('[data-cy="confirm-order"]').click();
    cy.get('#global-message').should('contain', 'Tu pedido está vacío');
    cy.get('@createOrder.all').should('have.length', 0);
    cy.screenshot('02-validacion-carrito-vacio');
  });

  it('muestra un fallo controlado de API y permite recuperar la interfaz', () => {
    cy.intercept('POST', '/api/orders', { statusCode: 503, body: { message: 'El servicio de pedidos está temporalmente no disponible.' } }).as('failedOrder');
    cy.visit('/');
    cy.get('[data-cy="product-capuccino"]').find('[data-add]').click();
    cy.get('[data-cy="confirm-order"]').click();
    cy.wait('@failedOrder').its('response.statusCode').should('eq', 503);
    cy.get('#global-message').should('contain', 'temporalmente no disponible');
    cy.get('[data-cy="cart-item-capuccino"]').should('be.visible');
    cy.get('[data-cy="confirm-order"]').should('not.be.disabled');
    cy.screenshot('03-fallo-api-recuperable');
  });
});
