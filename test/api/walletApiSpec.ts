/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
/*
import frisby = require('frisby')

const REST_URL = 'http://localhost:3000/rest'

const jsonHeader = { 'content-type': 'application/json' }
let authHeader: { Authorization: string, 'content-type': string }

beforeAll(() => {
  return frisby.post(`${REST_URL}/user/login`, {
    headers: jsonHeader,
    body: {
      email: 'demo',
      password: 'demo'
    }
  })
    .expect('status', 200)
    .then(({ json }) => {
      authHeader = { Authorization: `Bearer ${json.authentication.token}`, 'content-type': 'application/json' }
    })
})

describe('/api/Wallets', () => {
  it('GET wallet is forbidden via public API', () => {
    return frisby.get(`${REST_URL}/wallet/balance`)
      .expect('status', 401)
  })

  it('GET wallet retrieves wallet amount of requesting user', () => {
    return frisby.get(`${REST_URL}/wallet/balance`, {
      headers: authHeader
    })
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .expect('json', {
        data: 200
      })
  })

  it('PUT wallet is forbidden via public API', () => {
    return frisby.put(`${REST_URL}/wallet/balance`, {
      body: {
        balance: 10
      }
    })
      .expect('status', 401)
  })

  it('PUT charge wallet from credit card of requesting user', () => {
    return frisby.put(`${REST_URL}/wallet/balance`, {
      headers: authHeader,
      body: {
        balance: 10,
        paymentId: 2
      }
    })
      .expect('status', 200)
      .then(({ json }) => {
        return frisby.get(`${REST_URL}/wallet/balance`, {
          headers: authHeader
        })
          .expect('status', 200)
          .expect('header', 'content-type', /application\/json/)
          .expect('json', {
            data: 210
          })
      })
  })

  it('PUT charge wallet from foreign credit card is forbidden', () => {
    return frisby.put(`${REST_URL}/wallet/balance`, {
      headers: authHeader,
      body: {
        balance: 10,
        paymentId: 1
      }
    })
      .expect('status', 402)
  })

  it('PUT charge wallet without credit card is forbidden', () => {
    return frisby.put(`${REST_URL}/wallet/balance`, {
      headers: authHeader,
      body: {
        balance: 10
      }
    })
      .expect('status', 402)
  })
})
*/
/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require('frisby')

const REST_URL = 'http://localhost:3000/rest'
const jsonHeader = { 'content-type': 'application/json' }
let authHeader: { Authorization: string, 'content-type': string }

beforeAll(async () => {
  const { json } = await frisby.post(`${REST_URL}/user/login`, {
    headers: jsonHeader,
    body: {
      email: 'demo',
      password: 'demo'
    }
  })
    .expect('status', 200)
  authHeader = { Authorization: `Bearer ${json.authentication.token}`, 'content-type': 'application/json' }
})

describe('/api/Wallets', () => {
  it('GET wallet is forbidden via public API', () => {
    return frisby.get(`${REST_URL}/wallet/balance`)
      .expect('status', 401)
  })

  it('GET wallet retrieves wallet balance of the requesting user', () => {
    return frisby.get(`${REST_URL}/wallet/balance`, { headers: authHeader })
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .expect('json', { data: 200 })
  })

  it('PUT wallet is forbidden via public API', () => {
    return frisby.put(`${REST_URL}/wallet/balance`, {
      body: { balance: 10 }
    })
      .expect('status', 401)
  })

  it('PUT charge wallet from credit card of requesting user', async () => {
    await frisby.put(`${REST_URL}/wallet/balance`, {
      headers: authHeader,
      body: {
        balance: 10,
        paymentId: 2
      }
    })
      .expect('status', 200)

    return frisby.get(`${REST_URL}/wallet/balance`, { headers: authHeader })
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .expect('json', { data: 210 })
  })

  const forbiddenWalletTests = [
    {
      description: 'PUT charge wallet from foreign credit card is forbidden',
      body: { balance: 10, paymentId: 1 },
      expectedStatus: 402
    },
    {
      description: 'PUT charge wallet without credit card is forbidden',
      body: { balance: 10 },
      expectedStatus: 402
    }
  ]

  forbiddenWalletTests.forEach(({ description, body, expectedStatus }) => {
    it(description, () => {
      return frisby.put(`${REST_URL}/wallet/balance`, {
        headers: authHeader,
        body
      }).expect('status', expectedStatus)
    })
  })
})
