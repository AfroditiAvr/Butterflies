/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import fetch from 'node-fetch'; // Replace Frisby with native fetch to reduce dependency bloat
import config from 'config';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib'; // Import only what's needed from otplib
const security = require('../../lib/insecurity');

const REST_URL = 'http://localhost:3000/rest';
const API_URL = 'http://localhost:3000/api';

const jsonHeader = { 'content-type': 'application/json' };

// TypeScript types for request body
interface LoginRequest {
  email: string;
  password: string;
  totpSecret?: string;
}

async function login({ email, password, totpSecret }: LoginRequest) {
  try {
    const loginRes = await fetch(REST_URL + '/user/login', {
      method: 'POST',
      headers: jsonHeader,
      body: JSON.stringify({ email, password }),
    });

    const loginData = await loginRes.json();
    if (loginData.status === 'totp_token_required') {
      if (!totpSecret) throw new Error('TOTP Secret is required');

      const totpRes = await fetch(REST_URL + '/2fa/verify', {
        method: 'POST',
        headers: jsonHeader,
        body: JSON.stringify({
          tmpToken: loginData.data.tmpToken,
          totpToken: authenticator.generate(totpSecret),
        }),
      });

      const totpData = await totpRes.json();
      return totpData.authentication;
    }

    return loginData.authentication;
  } catch (error) {
    throw new Error(`Login failed for ${email}: ${error.message}`);
  }
}

async function register({ email, password, totpSecret }: LoginRequest) {
  try {
    const res = await fetch(API_URL + '/Users/', {
      method: 'POST',
      headers: jsonHeader,
      body: JSON.stringify({
        email,
        password,
        passwordRepeat: password,
        securityQuestion: null,
        securityAnswer: null,
      }),
    });

    const registrationData = await res.json();

    if (totpSecret) {
      const { token } = await login({ email, password, totpSecret });

      const setupRes = await fetch(REST_URL + '/2fa/setup', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          password,
          setupToken: security.authorize({
            secret: totpSecret,
            type: 'totp_setup_secret',
          }),
          initialToken: authenticator.generate(totpSecret),
        }),
      });

      if (!setupRes.ok) throw new Error(`Failed to enable 2FA for user: ${email}`);
    }

    return registrationData;
  } catch (error) {
    throw new Error(`Failed to register ${email}: ${error.message}`);
  }
}

async function getStatus(token: string) {
  const res = await fetch(REST_URL + '/2fa/status', {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      'content-type': 'application/json',
    },
  });

  return res.json();
}

describe('/rest/2fa/verify', () => {
  it('POST should return a valid authentication when a valid tmp token is passed', async () => {
    const tmpTokenWurstbrot = security.authorize({
      userId: 10,
      type: 'password_valid_needs_second_factor_token',
    });

    const totpToken = authenticator.generate('IFTXE3SPOEYVURT2MRYGI52TKJ4HC3KH');

    const res = await fetch(REST_URL + '/2fa/verify', {
      method: 'POST',
      headers: jsonHeader,
      body: JSON.stringify({ tmpToken: tmpTokenWurstbrot, totpToken }),
    });

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.authentication.token).toBeDefined();
  });

  it('POST should fail if an invalid totp token is used', async () => {
    const tmpTokenWurstbrot = security.authorize({
      userId: 10,
      type: 'password_valid_needs_second_factor_token',
    });

    const totpToken = authenticator.generate('THIS9ISNT8THE8RIGHT8SECRET');

    const res = await fetch(REST_URL + '/2fa/verify', {
      method: 'POST',
      headers: jsonHeader,
      body: JSON.stringify({ tmpToken: tmpTokenWurstbrot, totpToken }),
    });

    expect(res.status).toBe(401);
  });
});
