/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import request from 'supertest'
import { expect } from '@jest/globals'
import config from 'config'

const API_URL = 'http://localhost:3000/api'
const REST_URL = 'http://localhost:3000/rest'

let authHeader: { Authorization: string, 'content-type': string }

beforeAll(async () => {
  const res = await request(REST_URL)
    .post('/user/login')
    .send({
      email: 'jim@' + config.get<string>('application.domain'),
      password: 'ncc-1701'
    })
  authHeader = { Authorization: 'Bearer ' + res.body.authentication.token, 'content-type': 'application/json' }
})

describe('/api/BasketItems', () => {
  it('GET all basket items is forbidden via public API', async () => {
    const res = await request(API_URL).get('/BasketItems')
    expect(res.status).toBe(401)
  })

  it('POST new basket item is forbidden via public API', async () => {
    const res = await request(API_URL)
      .post('/BasketItems')
      .send({ BasketId: 2, ProductId: 1, quantity: 1 })
    expect(res.status).toBe(401)
  })

  it('GET all basket items', async () => {
    const res = await request(API_URL)
      .get('/BasketItems')
      .set(authHeader)
    expect(res.status).toBe(200)
  })

  it('POST new basket item', async () => {
    const res = await request(API_URL)
      .post('/BasketItems')
      .set(authHeader)
      .send({ BasketId: 2, ProductId: 2, quantity: 1 })
    expect(res.status).toBe(200)
  })

  it('POST new basket item with more than available quantity is forbidden', async () => {
    const res = await request(API_URL)
      .post('/BasketItems')
      .set(authHeader)
      .send({ BasketId: 2, ProductId: 2, quantity: 101 })
    expect(res.status).toBe(400)
  })

  it('POST new basket item with more than allowed quantity is forbidden', async () => {
    const res = await request(API_URL)
      .post('/BasketItems')
      .set(authHeader)
      .send({ BasketId: 2, ProductId: 1, quantity: 6 })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('You can order only up to 5 items of this product.')
  })
})

describe('/api/BasketItems/:id', () => {
  it('GET basket item by id is forbidden via public API', async () => {
    const res = await request(API_URL).get('/BasketItems/1')
    expect(res.status).toBe(401)
  })

  it('PUT update basket item is forbidden via public API', async () => {
    const res = await request(API_URL)
      .put('/BasketItems/1')
      .send({ quantity: 2 })
    expect(res.status).toBe(401)
  })

  it('DELETE basket item is forbidden via public API', async () => {
    const res = await request(API_URL).delete('/BasketItems/1')
    expect(res.status).toBe(401)
  })

  it('GET newly created basket item by id', async () => {
    const res = await request(API_URL)
      .post('/BasketItems')
      .set(authHeader)
      .send({ BasketId: 2, ProductId: 6, quantity: 3 })
    const itemId = res.body.data.id

    const getRes = await request(API_URL)
      .get(`/BasketItems/${itemId}`)
      .set(authHeader)
    expect(getRes.status).toBe(200)
  })

  it('PUT update newly created basket item', async () => {
    const res = await request(API_URL)
      .post('/BasketItems')
      .set(authHeader)
      .send({ BasketId: 2, ProductId: 3, quantity: 3 })
    const itemId = res.body.data.id

    const updateRes = await request(API_URL)
      .put(`/BasketItems/${itemId}`)
      .set(authHeader)
      .send({ quantity: 20 })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.quantity).toBe(20)
  })

  it('PUT update basket ID of basket item is forbidden', async () => {
    const res = await request(API_URL)
      .post('/BasketItems')
      .set(authHeader)
      .send({ BasketId: 2, ProductId: 8, quantity: 8 })
    const itemId = res.body.data.id

    const updateRes = await request(API_URL)
      .put(`/BasketItems/${itemId}`)
      .set(authHeader)
      .send({ BasketId: 42 })
    expect(updateRes.status).toBe(400)
    expect(updateRes.body.errors[0].message).toBe('`BasketId` cannot be updated due `noUpdate` constraint')
  })

  it('PUT update basket ID of basket item without basket ID', async () => {
    const res = await request(API_URL)
      .post('/BasketItems')
      .set(authHeader)
      .send({ ProductId: 8, quantity: 8 })
    const itemId = res.body.data.id

    const updateRes = await request(API_URL)
      .put(`/BasketItems/${itemId}`)
      .set(authHeader)
      .send({ BasketId: 3 })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.BasketId).toBe(3)
  })

  it('PUT update product ID of basket item is forbidden', async () => {
    const res = await request(API_URL)
      .post('/BasketItems')
      .set(authHeader)
      .send({ BasketId: 2, ProductId: 9, quantity: 9 })
    const itemId = res.body.data.id

    const updateRes = await request(API_URL)
      .put(`/BasketItems/${itemId}`)
      .set(authHeader)
      .send({ ProductId: 42 })
    expect(updateRes.status).toBe(400)
    expect(updateRes.body.errors[0].message).toBe('`ProductId` cannot be updated due `noUpdate` constraint')
  })

  it('PUT update newly created basket item with more than available quantity is forbidden', async () => {
    const res = await request(API_URL)
      .post('/BasketItems')
      .set(authHeader)
      .send({ BasketId: 2, ProductId: 12, quantity: 12 })
    const itemId = res.body.data.id

    const updateRes = await request(API_URL)
      .put(`/BasketItems/${itemId}`)
      .set(authHeader)
      .send({ quantity: 100 })
    expect(updateRes.status).toBe(400)
  })

  it('PUT update basket item with more than allowed quantity is forbidden', async () => {
    const res = await request(API_URL)
      .post('/BasketItems')
      .set(authHeader)
      .send({ BasketId: 2, ProductId: 1, quantity: 1 })
    const itemId = res.body.data.id

    const updateRes = await request(API_URL)
      .put(`/BasketItems/${itemId}`)
      .set(authHeader)
      .send({ quantity: 6 })
    expect(updateRes.status).toBe(400)
    expect(updateRes.body.error).toBe('You can order only up to 5 items of this product.')
  })

  it('DELETE newly created basket item', async () => {
    const res = await request(API_URL)
      .post('/BasketItems')
      .set(authHeader)
      .send({ BasketId: 2, ProductId: 10, quantity: 10 })
    const itemId = res.body.data.id

    const deleteRes = await request(API_URL)
      .delete(`/BasketItems/${itemId}`)
      .set(authHeader)
    expect(deleteRes.status).toBe(200)
  })
})

