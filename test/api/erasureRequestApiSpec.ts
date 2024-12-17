/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require('frisby')

const jsonHeader = { 'content-type': 'application/json' }
const BASE_URL = 'http://localhost:3000'
const REST_URL = 'http://localhost:3000/rest'

const login = (email: string, password: string) => {
  return frisby.post(REST_URL + '/user/login', {
    headers: jsonHeader,
    body: { email, password }
  }).expect('status', 200)
}

describe('/dataerasure', () => {
  it('GET erasure form for logged-in users includes their email and security question', () => {
    return login('bjoern@owasp.org', 'kitten lesser pooch karate buffoon indoors')
      .then(({ json: jsonLogin }) => {
        return frisby.get(BASE_URL + '/dataerasure/', {
          headers: { Cookie: 'token=' + jsonLogin.authentication.token }
        })
          .expect('status', 200)
          .expect('bodyContains', 'bjoern@owasp.org')
          .expect('bodyContains', 'Name of your favorite pet?')
      })
  })

  it('GET erasure form rendering fails for users without assigned security answer', () => {
    return login('bjoern.kimminich@gmail.com', 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=')
      .then(({ json: jsonLogin }) => {
        return frisby.get(BASE_URL + '/dataerasure/', {
          headers: { Cookie: 'token=' + jsonLogin.authentication.token }
        })
          .expect('status', 500)
          .expect('bodyContains', 'Error: No answer found!')
      })
  })

  it('GET erasure form rendering fails on unauthenticated access', () => {
    return frisby.get(BASE_URL + '/dataerasure/')
      .expect('status', 500)
      .expect('bodyContains', 'Error: Blocked illegal activity')
  })

  it('POST erasure request does not actually delete the user', () => {
    const form = frisby.formData()
    form.append('email', 'bjoern.kimminich@gmail.com')

    return login('bjoern.kimminich@gmail.com', 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=')
      .then(({ json: jsonLogin }) => {
        return frisby.post(BASE_URL + '/dataerasure/', {
          headers: { Cookie: 'token=' + jsonLogin.authentication.token },
          body: form
        })
          .expect('status', 200)
          .expect('header', 'Content-Type', 'text/html; charset=utf-8')
          .then(() => {
            return login('bjoern.kimminich@gmail.com', 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=')
              .expect('status', 200)
          })
      })
  })

  it('POST erasure form fails on unauthenticated access', () => {
    return frisby.post(BASE_URL + '/dataerasure/')
      .expect('status', 500)
      .expect('bodyContains', 'Error: Blocked illegal activity')
  })

  it('POST erasure request with empty layout parameter returns', () => {
    return login('bjoern.kimminich@gmail.com', 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=')
      .then(({ json: jsonLogin }) => {
        return frisby.post(BASE_URL + '/dataerasure/', {
          headers: { Cookie: 'token=' + jsonLogin.authentication.token },
          body: { layout: null }
        })
          .expect('status', 200)
      })
  })

  it('POST erasure request with non-existing file path as layout parameter throws error', () => {
    return login('bjoern.kimminich@gmail.com', 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=')
      .then(({ json: jsonLogin }) => {
        return frisby.post(BASE_URL + '/dataerasure/', {
          headers: { Cookie: 'token=' + jsonLogin.authentication.token },
          body: { layout: '../this/file/does/not/exist' }
        })
          .expect('status', 500)
          .expect('bodyContains', 'no such file or directory')
      })
  })

  it('POST erasure request with existing file path as layout parameter returns content truncated', () => {
    return login('bjoern.kimminich@gmail.com', 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=')
      .then(({ json: jsonLogin }) => {
        return frisby.post(BASE_URL + '/dataerasure/', {
          headers: { Cookie: 'token=' + jsonLogin.authentication.token },
          body: { layout: '../package.json' }
        })
          .expect('status', 200)
          .expect('bodyContains', 'juice-shop')
          .expect('bodyContains', '......')
      })
  })
})
