/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require('frisby')
import config from 'config'

const jsonHeader = { 'content-type': 'application/json' }
const REST_URL = 'http://localhost:3000/rest'
const API_URL = 'http://localhost:3000/api'

async function login ({ email, password }: { email: string, password: string }) {
  // @ts-expect-error FIXME promise return handling broken
  const loginRes = await frisby
    .post(`${REST_URL}/user/login`, {
      email,
      password
    }).catch((res: any) => {
      if (res.json?.type && res.json.status === 'totp_token_required') {
        return res
      }
      throw new Error(`Failed to login '${email}'`)
    })

  return loginRes.json.authentication
}

async function getTokenForLogin(email: string, password: string) {
  const loginResponse = await frisby.post(REST_URL + '/user/login', {
    headers: jsonHeader,
    body: {
      email: email,
      password: password
    }
  }).expect('status', 200)

  return loginResponse.json.authentication.token
}

describe('/rest/deluxe-membership', () => {
  it('GET deluxe membership status for customers', async () => {
    const token = await getTokenForLogin('bender@' + config.get<string>('application.domain'), 'OhG0dPlease1nsertLiquor!')
    await frisby.get(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' }
    })
      .expect('status', 200)
      .expect('json', 'data', { membershipCost: 49 })
  })

  it('GET deluxe membership status for deluxe members throws error', async () => {
    const token = await getTokenForLogin('ciso@' + config.get<string>('application.domain'), 'mDLx?94T~1CfVfZMzw@sJ9f?s3L6lbMqE70FfI8^54jbNikY5fymx7c!YbJb')
    await frisby.get(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' }
    })
      .expect('status', 400)
      .expect('json', 'error', 'You are already a deluxe member!')
  })

  it('GET deluxe membership status for admin throws error', async () => {
    const token = await getTokenForLogin('admin@' + config.get<string>('application.domain'), 'admin123')
    await frisby.get(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' }
    })
      .expect('status', 400)
      .expect('json', 'error', 'You are not eligible for deluxe membership!')
  })

  it('GET deluxe membership status for accountant throws error', async () => {
    const token = await getTokenForLogin('accountant@' + config.get<string>('application.domain'), 'i am an awesome accountant')
    await frisby.get(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' }
    })
      .expect('status', 400)
      .expect('json', 'error', 'You are not eligible for deluxe membership!')
  })

  it('POST upgrade deluxe membership status for customers', async () => {
    const { token } = await login({
      email: `bender@${config.get<string>('application.domain')}`,
      password: 'OhG0dPlease1nsertLiquor!'
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
      email: `jim@${config.get<string>('application.domain')}`,
      password: 'ncc-1701'
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
    const token = await getTokenForLogin('ciso@' + config.get<string>('application.domain'), 'mDLx?94T~1CfVfZMzw@sJ9f?s3L6lbMqE70FfI8^54jbNikY5fymx7c!YbJb')
    await frisby.post(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: {
        paymentMode: 'wallet'
      }
    })
      .expect('status', 400)
      .expect('json', 'error', 'Something went wrong. Please try again!')
  })

  it('POST deluxe membership status for admin throws error', async () => {
    const token = await getTokenForLogin('admin@' + config.get<string>('application.domain'), 'admin123')
    await frisby.post(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: {
        paymentMode: 'wallet'
      }
    })
      .expect('status', 400)
      .expect('json', 'error', 'Something went wrong. Please try again!')
  })

  it('POST deluxe membership status for accountant throws error', async () => {
    const token = await getTokenForLogin('accountant@' + config.get<string>('application.domain'), 'i am an awesome accountant')
    await frisby.post(REST_URL + '/deluxe-membership', {
      headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: {
        paymentMode: 'wallet'
      }
    })
      .expect('status', 400)
      .expect('json', 'error', 'Something went wrong. Please try again!')
  })
})
