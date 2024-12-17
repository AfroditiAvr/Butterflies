/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby from 'frisby';
import { expect } from '@jest/globals';
import { generateCoupon } from '../../lib/insecurity';

const API_URL = 'http://localhost:3000/api';
const REST_URL = 'http://localhost:3000/rest';

const jsonHeader = { 'content-type': 'application/json' };
let authHeader: { Authorization: string, 'content-type': string };

const COUPON_VALID = generateCoupon(15);
const COUPON_OUTDATED = generateCoupon(20, new Date(2001, 0, 1));
const COUPON_FORGED = generateCoupon(99);

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'jim@juice-sh.op';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'ncc-1701';

beforeAll(async () => {
  const response = await frisby.post(REST_URL + '/user/login', {
    headers: jsonHeader,
    body: {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    }
  });

  const { json } = response;
  authHeader = { Authorization: `Bearer ${json.authentication.token}`, 'content-type': 'application/json' };
});

// Helper to ensure status and response type consistency
const expectJsonResponse = (response: frisby.Frisby) => {
  return response
    .expect('header', 'content-type', /application\/json/)
    .expect('status', 200);
};

describe('/rest/basket/:id', () => {
  it('GET existing basket by id is not allowed via public API', async () => {
    await frisby.get(`${REST_URL}/basket/1`)
      .expect('status', 401);
  });

  it('GET empty basket when requesting non-existing basket id', async () => {
    await frisby.get(`${REST_URL}/basket/4711`, { headers: authHeader })
      .expect('status', 200)
      .expect('json', 'data', {});
  });

  it('GET existing basket with contained products by id', async () => {
    const response = await frisby.get(`${REST_URL}/basket/1`, { headers: authHeader });
    expectJsonResponse(response);
    expect(response.json.data.Products.length).toBeGreaterThan(0);
  });
});

describe('/api/Baskets', () => {
  it('POST new basket is not part of API', async () => {
    await frisby.post(`${API_URL}/Baskets`, {
      headers: authHeader,
      body: { UserId: 1 },
    })
      .expect('status', 500)
      .expect('bodyContains', 'Error');
  });

  it('GET all baskets is not part of API', async () => {
    await frisby.get(`${API_URL}/Baskets`, { headers: authHeader })
      .expect('status', 500)
      .expect('bodyContains', 'Error');
  });
});

describe('/api/Baskets/:id', () => {
  it('GET existing basket is not part of API', async () => {
    await frisby.get(`${API_URL}/Baskets/1`, { headers: authHeader })
      .expect('status', 500)
      .expect('bodyContains', 'Error');
  });

  it('PUT update existing basket is not part of API', async () => {
    await frisby.put(`${API_URL}/Baskets/1`, {
      headers: authHeader,
      body: { UserId: 2 },
    })
      .expect('status', 500)
      .expect('bodyContains', 'Error');
  });

  it('DELETE existing basket is not part of API', async () => {
    await frisby.del(`${API_URL}/Baskets/1`, { headers: authHeader })
      .expect('status', 500)
      .expect('bodyContains', 'Error');
  });
});

describe('/rest/basket/:id', () => {
  it('GET existing basket of another user', async () => {
    const response = await frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: {
        email: process.env.TEST_USER_EMAIL_2 || 'bjoern.kimminich@gmail.com',
        password: process.env.TEST_USER_PASSWORD_2 || 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=',
      }
    });

    const { json } = response;
    const basketResponse = await frisby.get(`${REST_URL}/basket/2`, {
      headers: { Authorization: `Bearer ${json.authentication.token}` },
    });

    expectJsonResponse(basketResponse);
    expect(basketResponse.json.data).toHaveProperty('id', 2);
  });
});

describe('/rest/basket/:id/checkout', () => {
  it('POST placing an order for a basket is not allowed via public API', async () => {
    await frisby.post(`${REST_URL}/basket/1/checkout`)
      .expect('status', 401);
  });

  it('POST placing an order for an existing basket returns orderId', async () => {
    const response = await frisby.post(`${REST_URL}/basket/1/checkout`, { headers: authHeader });
    expectJsonResponse(response);
    expect(response.json.orderConfirmation).toBeDefined();
  });

  it('POST placing an order for a non-existing basket fails', async () => {
    await frisby.post(`${REST_URL}/basket/42/checkout`, { headers: authHeader })
      .expect('status', 500)
      .expect('bodyContains', 'Error: Basket with id=42 does not exist.');
  });

  it('POST placing an order for a basket with a negative total cost is possible', async () => {
    await frisby.post(`${API_URL}/BasketItems`, {
      headers: authHeader,
      body: { BasketId: 2, ProductId: 10, quantity: -100 },
    })
      .expect('status', 200);

    const checkoutResponse = await frisby.post(`${REST_URL}/basket/3/checkout`, { headers: authHeader });
    expectJsonResponse(checkoutResponse);
    expect(checkoutResponse.json.orderConfirmation).toBeDefined();
  });

  it('POST placing an order for a basket with 99% discount is possible', async () => {
    await frisby.put(`${REST_URL}/basket/2/coupon/${encodeURIComponent(COUPON_FORGED)}`, { headers: authHeader })
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .expect('json', { discount: 99 });

    const checkoutResponse = await frisby.post(`${REST_URL}/basket/2/checkout`, { headers: authHeader });
    expectJsonResponse(checkoutResponse);
    expect(checkoutResponse.json.orderConfirmation).toBeDefined();
  });
});

describe('/rest/basket/:id/coupon/:coupon', () => {
  it('PUT apply valid coupon to existing basket', async () => {
    await frisby.put(`${REST_URL}/basket/1/coupon/${encodeURIComponent(COUPON_VALID)}`, { headers: authHeader })
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .expect('json', { discount: 15 });
  });

  it('PUT apply invalid coupon is not accepted', async () => {
    await frisby.put(`${REST_URL}/basket/1/coupon/xxxxxxxxxx`, { headers: authHeader })
      .expect('status', 404);
  });

  it('PUT apply outdated coupon is not accepted', async () => {
    await frisby.put(`${REST_URL}/basket/1/coupon/${encodeURIComponent(COUPON_OUTDATED)}`, { headers: authHeader })
      .expect('status', 404);
  });

  it('PUT apply valid coupon to non-existing basket throws error', async () => {
    await frisby.put(`${REST_URL}/basket/4711/coupon/${encodeURIComponent(COUPON_VALID)}`, { headers: authHeader })
      .expect('status', 500)
      .expect('bodyContains', 'Error');
  });
});
