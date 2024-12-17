/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

/*
import frisby = require('frisby')
const Joi = frisby.Joi
const utils = require('../../lib/utils')

const REST_URL = 'http://localhost:3000/rest/admin'

describe('/rest/admin/application-version', () => {
  it('GET application version from package.json', () => {
    return frisby.get(REST_URL + '/application-version')
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .expect('json', {
        version: utils.version()
      })
  })
})

describe('/rest/admin/application-configuration', () => {
  it('GET application configuration', () => {
    return frisby.get(REST_URL + '/application-configuration')
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .expect('jsonTypes', {
        config: Joi.object()
      })
  })
})
*/

/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require('frisby');
const Joi = frisby.Joi;
import { getConfig } from '../../lib/utils';

const REST_URL = 'http://localhost:3000/rest/admin';

const jsonHeader = { 'content-type': 'application/json' };

const request = {
  get: (url: string, headers = jsonHeader) => frisby.get(url, { headers }),
  post: (url: string, body: any, headers = jsonHeader) => frisby.post(url, { headers, body }),
};

describe('/rest/admin/application-version', () => {
  it('GET application version from package.json', async () => {
    const expectedVersion = getConfig().version;

    await request.get(`${REST_URL}/application-version`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .expect('json', {
        version: expectedVersion,
      });
  });
});

describe('/rest/admin/application-configuration', () => {
  it('GET application configuration', async () => {
    await request.get(`${REST_URL}/application-configuration`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .expect('jsonTypes', {
        config: Joi.object(),
      });
  });
});

