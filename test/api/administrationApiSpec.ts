/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
import frisby from 'frisby';
import { Joi } from 'frisby';
import utils from '../../lib/utils';

const REST_URL = 'http://localhost:3000/rest/admin';
const jsonHeader = { 'content-type': 'application/json' };

// Helper function to make GET requests
const getRequest = async (url) => {
  return await frisby.get(url).expect('status', 200);
};

// Helper function to validate content-type header
const expectJsonContentType = (response) => {
  return response.expect('header', 'content-type', /application\/json/);
};

describe('/rest/admin/application-version', () => {
  it('GET application version from package.json', async () => {
    const response = await getRequest(`${REST_URL}/application-version`);
    
    expectJsonContentType(response);
    await response.expect('json', {
      version: utils.version()
    });
  });
});

describe('/rest/admin/application-configuration', () => {
  it('GET application configuration', async () => {
    const response = await getRequest(`${REST_URL}/application-configuration`);

    expectJsonContentType(response);
    await response.expect('jsonTypes', {
      config: Joi.object()
    });
  });
});

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
})*/
