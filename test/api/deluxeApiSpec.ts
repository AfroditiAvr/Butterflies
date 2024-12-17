/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require('frisby')
import config from 'config'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const jsonHeader = { 'content-type': 'application/json' }
const REST_URL = 'https://localhost:3000/rest'  // Use HTTPS for security
const API_URL = 'https://localhost:3000/api'    // Use HTTPS for security

async function login ({ email, password }: { email: string, password: string }) {
  try {
    const loginRes = await frisby
      .post(`${REST_URL}/user/login`, {
        email,
        password
      })

    // Handle TOTP token if required
    if (loginRes.json?.type && loginRes.json.status === 'totp_token_required') {
      return loginRes
    }

    return loginRes.json.authentication
  } catch (error) {
    throw new Error(`Failed to login '${email}': ${error.message}`)
  }
}

describe('/rest/deluxe-membership', () => {
  it('GET deluxe membership status for customers', async () => {
    const email = process.env.TEST_USER_EMAIL || 'bender@juice-sh.op'
    const password = process.env.TEST_USER_PASSWORD || 'OhG0dPlease1nsertLiquor!'

    const loginResponse = await frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: { email, password }
    })

    const { json: jsonLogin } = loginResponse
    await frisby.get(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + jsonLogin.authentication.token, 'content-type': 'application/json' }
    })
      .expect('status', 200)
      .expect('json', 'data', { membershipCost: 49 })
  })

  it('GET deluxe membership status for deluxe members throws error', async () => {
    const email = process.env.TEST_DELUXE_USER_EMAIL || 'ciso@juice-sh.op'
    const password = process.env.TEST_DELUXE_USER_PASSWORD || 'mDLx?94T~1CfVfZMzw@sJ9f?s3L6lbMqE70FfI8^54jbNikY5fymx7c!YbJb'

    const loginResponse = await frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: { email, password }
    })

    const { json: jsonLogin } = loginResponse
    await frisby.get(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + jsonLogin.authentication.token, 'content-type': 'application/json' }
    })
      .expect('status', 400)
      .expect('json', 'error', 'You are already a deluxe member!')
  })

  it('GET deluxe membership status for admin throws error', async () => {
    const email = process.env.TEST_ADMIN_EMAIL || 'admin@juice-sh.op'
    const password = process.env.TEST_ADMIN_PASSWORD || 'admin123'

    const loginResponse = await frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: { email, password }
    })

    const { json: jsonLogin } = loginResponse
    await frisby.get(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + jsonLogin.authentication.token, 'content-type': 'application/json' }
    })
      .expect('status', 400)
      .expect('json', 'error', 'You are not eligible for deluxe membership!')
  })

  it('GET deluxe membership status for accountant throws error', async () => {
    const email = process.env.TEST_ACCOUNTANT_EMAIL || 'accountant@juice-sh.op'
    const password = process.env.TEST_ACCOUNTANT_PASSWORD || 'i am an awesome accountant'

    const loginResponse = await frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: { email, password }
    })

    const { json: jsonLogin } = loginResponse
    await frisby.get(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + jsonLogin.authentication.token, 'content-type': 'application/json' }
    })
      .expect('status', 400)
      .expect('json', 'error', 'You are not eligible for deluxe membership!')
  })

  it('POST upgrade deluxe membership status for customers', async () => {
    const { token } = await login({
      email: process.env.TEST_USER_EMAIL || `bender@${config.get<string>('application.domain')}`,
      password: process.env.TEST_USER_PASSWORD || 'OhG0dPlease1nsertLiquor!'
    })

    const { json } = await frisby.get(API_URL + '/Cards', {
      headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' }
    })
      .expect('status', 200)
      .promise()

    await frisby.post(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: {
        paymentMode: 'card',
        paymentId: json.data[0].id.toString()
      }
    })
      .expect('status', 200)
      .expect('json', 'status', 'success')
      .promise()
  })

  it('POST deluxe membership status with wrong card id throws error', async () => {
    const { token } = await login({
      email: process.env.TEST_USER_EMAIL || `jim@${config.get<string>('application.domain')}`,
      password: process.env.TEST_USER_PASSWORD || 'ncc-1701'
    })

    await frisby.post(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: {
        paymentMode: 'card',
        paymentId: 1337
      }
    })
      .expect('status', 400)
      .expect('json', 'error', 'Invalid Card')
      .promise()
  })

  it('POST deluxe membership status for deluxe members throws error', async () => {
    const email = process.env.TEST_DELUXE_USER_EMAIL || 'ciso@juice-sh.op'
    const password = process.env.TEST_DELUXE_USER_PASSWORD || 'mDLx?94T~1CfVfZMzw@sJ9f?s3L6lbMqE70FfI8^54jbNikY5fymx7c!YbJb'

    const loginResponse = await frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: { email, password }
    })

    const { json: jsonLogin } = loginResponse
    await frisby.post(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + jsonLogin.authentication.token, 'content-type': 'application/json' },
      body: {
        paymentMode: 'wallet'
      }
    })
      .expect('status', 400)
      .expect('json', 'error', 'Something went wrong. Please try again!')
  })

  it('POST deluxe membership status for admin throws error', async () => {
    const email = process.env.TEST_ADMIN_EMAIL || 'admin@juice-sh.op'
    const password = process.env.TEST_ADMIN_PASSWORD || 'admin123'

    const loginResponse = await frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: { email, password }
    })

    const { json: jsonLogin } = loginResponse
    await frisby.post(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + jsonLogin.authentication.token, 'content-type': 'application/json' },
      body: {
        paymentMode: 'wallet'
      }
    })
      .expect('status', 400)
      .expect('json', 'error', 'Something went wrong. Please try again!')
  })

  it('POST deluxe membership status for accountant throws error', async () => {
    const email = process.env.TEST_ACCOUNTANT_EMAIL || 'accountant@juice-sh.op'
    const password = process.env.TEST_ACCOUNTANT_PASSWORD || 'i am an awesome accountant'

    const loginResponse = await frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: { email, password }
    })

    const { json: jsonLogin } = loginResponse
    await frisby.post(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + jsonLogin.authentication.token, 'content-type': 'application/json' },
      body: {
        paymentMode: 'wallet'
      }
    })
      .expect('status', 400)
      .expect('json', 'error', 'Something went wrong. Please try again!')
  })
})
