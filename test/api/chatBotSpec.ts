/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
/*
import frisby = require('frisby')
import { expect } from '@jest/globals'
import config from 'config'
import { initialize, bot } from '../../routes/chatbot'
import fs from 'fs/promises'
import * as utils from '../../lib/utils'

const URL = 'http://localhost:3000'
const REST_URL = `${URL}/rest/`
const API_URL = `${URL}/api/`
let trainingData: { data: any[] }

async function login ({ email, password }: { email: string, password: string }) {
  // @ts-expect-error FIXME promise return handling broken
  const loginRes = await frisby
    .post(REST_URL + '/user/login', {
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

describe('/chatbot', () => {
  beforeAll(async () => {
    await initialize()
    trainingData = JSON.parse(await fs.readFile(`data/chatbot/${utils.extractFilename(config.get('application.chatBot.trainingData'))}`, { encoding: 'utf8' }))
  })

  describe('/status', () => {
    it('GET bot training state', () => {
      return frisby.get(REST_URL + 'chatbot/status')
        .expect('status', 200)
        .expect('json', 'status', true)
    })

    it('GET bot state for anonymous users contains log in request', () => {
      return frisby.get(REST_URL + 'chatbot/status')
        .expect('status', 200)
        .expect('json', 'body', /Sign in to talk/)
    })

    it('GET bot state for authenticated users contains request for username', async () => {
      const { token } = await login({
        email: `J12934@${config.get<string>('application.domain')}`,
        password: '0Y8rMnww$*9VFYE§59-!Fg1L6t&6lB'
      })

      await frisby.setup({
        request: {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      }, true).get(REST_URL + 'chatbot/status')
        .expect('status', 200)
        .expect('json', 'body', /What shall I call you?/)
        .promise()
    })
  })

  describe('/respond', () => {
    it('Asks for username if not defined', async () => {
      const { token } = await login({
        email: `J12934@${config.get<string>('application.domain')}`,
        password: '0Y8rMnww$*9VFYE§59-!Fg1L6t&6lB'
      })

      const testCommand = trainingData.data[0].utterances[0]

      await frisby.setup({
        request: {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      }, true)
        .post(REST_URL + 'chatbot/respond', {
          body: {
            action: 'query',
            query: testCommand
          }
        })
        .expect('status', 200)
        .expect('json', 'action', 'namequery')
        .expect('json', 'body', 'I\'m sorry I didn\'t get your name. What shall I call you?')
        .promise()
    })

    it('Returns greeting if username is defined', async () => {
      if (bot == null) {
        throw new Error('Bot not initialized')
      }
      const { token } = await login({
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      })

      bot.addUser('1337', 'bkimminich')
      const testCommand = trainingData.data[0].utterances[0]

      await frisby.setup({
        request: {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      }, true)
        .post(REST_URL + 'chatbot/respond', {
          body: {
            action: 'query',
            query: testCommand
          }
        })
        .expect('status', 200)
        .expect('json', 'action', 'response')
        .expect('json', 'body', bot.greet('1337'))
        .promise()
    })

    it('Returns proper response for registered user', async () => {
      if (bot == null) {
        throw new Error('Bot not initialized')
      }
      const { token } = await login({
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      })
      bot.addUser('12345', 'bkimminich')
      const testCommand = trainingData.data[0].utterances[0]
      await frisby.setup({
        request: {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      }, true)
        .post(REST_URL + 'chatbot/respond', {
          body: {
            action: 'query',
            query: testCommand
          }
        })
        .post(REST_URL + 'chatbot/respond', {
          body: {
            action: 'query',
            query: testCommand
          }
        })
        .expect('status', 200)
        .promise()
        .then(({ json }) => {
          expect(trainingData.data[0].answers).toContainEqual(json)
        })
    })

    it('Responds with product price when asked question with product name', async () => {
      const { token } = await login({
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      })
      const { json } = await frisby.get(API_URL + '/Products/1')
        .expect('status', 200)
        .promise()

      await frisby.setup({
        request: {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      }, true)
        .post(REST_URL + 'chatbot/respond', {
          body: {
            action: 'query',
            query: 'How much is ' + json.data.name + '?'
          }
        })
        .expect('status', 200)
        .expect('json', 'action', 'response')
        .promise()
        .then(({ body = json.body }) => {
          expect(body).toContain(`${json.data.name} costs ${json.data.price}¤`)
        })
    })

    it('Greets back registered user after being told username', async () => {
      const { token } = await login({
        email: `stan@${config.get<string>('application.domain')}`,
        password: 'ship coffin krypt cross estate supply insurance asbestos souvenir'
      })
      await frisby.setup({
        request: {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      }, true)
        .post(REST_URL + 'chatbot/respond', {
          body: {
            action: 'setname',
            query: 'NotGuybrushThreepwood'
          }
        })
        .expect('status', 200)
        .expect('json', 'action', 'response')
        .expect('json', 'body', /NotGuybrushThreepwood/)
        .promise()
    })

    it('POST returns error for unauthenticated user', () => {
      const testCommand = trainingData.data[0].utterances[0]
      return frisby.setup({
        request: {
          headers: {
            Authorization: 'Bearer faketoken',
            'Content-Type': 'application/json'
          }
        }
      }, true)
        .post(REST_URL + 'chatbot/respond', {
          body: {
            query: testCommand
          }
        })
        .expect('status', 401)
        .expect('json', 'error', 'Unauthenticated user')
    })

    it('Returns proper response for custom callbacks', async () => {
      const functionTest = trainingData.data.filter(data => data.intent === 'queries.functionTest')
      const { token } = await login({
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      })
      const testCommand = functionTest[0].utterances[0]
      const testResponse = '3be2e438b7f3d04c89d7749f727bb3bd'
      await frisby.setup({
        request: {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      }, true)
        .post(REST_URL + 'chatbot/respond', {
          body: {
            action: 'query',
            query: testCommand
          }
        })
        .post(REST_URL + 'chatbot/respond', {
          body: {
            action: 'query',
            query: testCommand
          }
        })
        .expect('status', 200)
        .expect('json', 'action', 'response')
        .expect('json', 'body', testResponse)
        .promise()
    })

    it('Returns a 500 when the user name is set to crash request', async () => {
      await frisby.post(`${API_URL}/Users`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          email: `chatbot-testuser@${config.get<string>('application.domain')}`,
          password: 'testtesttest',
          username: '"',
          role: 'admin'
        }
      }).promise()

      const { token } = await login({
        email: `chatbot-testuser@${config.get<string>('application.domain')}`,
        password: 'testtesttest'
      })

      const functionTest = trainingData.data.filter(data => data.intent === 'queries.functionTest')
      const testCommand = functionTest[0].utterances[0]
      await frisby.post(REST_URL + 'chatbot/respond', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          action: 'query',
          query: testCommand
        }
      })
        .inspectResponse()
        .expect('status', 500)
        .promise()
    })
  })
})
*/
/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require('frisby');
import { expect } from '@jest/globals';
import config from 'config';
import { initialize, bot } from '../../routes/chatbot';
import fs from 'fs/promises';
import * as utils from '../../lib/utils';

const URL = 'http://localhost:3000';
const REST_URL = `${URL}/rest/`;
const API_URL = `${URL}/api/`;
let trainingData: { data: any[] };

// Helper function for user login
async function login({ email, password }: { email: string; password: string }) {
  try {
    const loginRes = await frisby.post(`${REST_URL}/user/login`, { email, password }).promise();
    return loginRes.json.authentication;
  } catch (err) {
    if (err.json?.type && err.json.status === 'totp_token_required') {
      return err.json;
    }
    throw new Error(`Failed to login: ${email}`);
  }
}

// Helper function to set up Frisby with authentication headers
function setupAuthenticatedRequest(token: string) {
  return frisby.setup({
    request: {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  }, true);
}

// Initialize training data before tests
beforeAll(async () => {
  await initialize();
  const trainingFilePath = `data/chatbot/${utils.extractFilename(config.get('application.chatBot.trainingData'))}`;
  trainingData = JSON.parse(await fs.readFile(trainingFilePath, { encoding: 'utf8' }));
});

describe('/chatbot', () => {
  describe('/status', () => {
    it('GET bot training state', () => {
      return frisby.get(`${REST_URL}chatbot/status`)
        .expect('status', 200)
        .expect('json', 'status', true);
    });

    it('GET bot state for anonymous users contains login request', () => {
      return frisby.get(`${REST_URL}chatbot/status`)
        .expect('status', 200)
        .expect('json', 'body', /Sign in to talk/);
    });

    it('GET bot state for authenticated users contains request for username', async () => {
      const { token } = await login({
        email: `J12934@${config.get<string>('application.domain')}`,
        password: '0Y8rMnww$*9VFYE§59-!Fg1L6t&6lB',
      });

      await setupAuthenticatedRequest(token)
        .get(`${REST_URL}chatbot/status`)
        .expect('status', 200)
        .expect('json', 'body', /What shall I call you?/);
    });
  });

  describe('/respond', () => {
    it('Asks for username if not defined', async () => {
      const { token } = await login({
        email: `J12934@${config.get<string>('application.domain')}`,
        password: '0Y8rMnww$*9VFYE§59-!Fg1L6t&6lB',
      });

      const testCommand = trainingData.data[0].utterances[0];

      await setupAuthenticatedRequest(token)
        .post(`${REST_URL}chatbot/respond`, {
          body: {
            action: 'query',
            query: testCommand,
          },
        })
        .expect('status', 200)
        .expect('json', 'action', 'namequery')
        .expect('json', 'body', "I'm sorry I didn't get your name. What shall I call you?");
    });

    it('Returns greeting if username is defined', async () => {
      if (!bot) throw new Error('Bot not initialized');

      const { token } = await login({
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=',
      });

      bot.addUser('1337', 'bkimminich');
      const testCommand = trainingData.data[0].utterances[0];

      await setupAuthenticatedRequest(token)
        .post(`${REST_URL}chatbot/respond`, {
          body: {
            action: 'query',
            query: testCommand,
          },
        })
        .expect('status', 200)
        .expect('json', 'action', 'response')
        .expect('json', 'body', bot.greet('1337'));
    });

    it('Responds with product price when asked question with product name', async () => {
      const { token } = await login({
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=',
      });

      const product = await frisby.get(`${API_URL}/Products/1`).expect('status', 200).promise();
      const productName = product.json.data.name;
      const productPrice = product.json.data.price;

      await setupAuthenticatedRequest(token)
        .post(`${REST_URL}chatbot/respond`, {
          body: {
            action: 'query',
            query: `How much is ${productName}?`,
          },
        })
        .expect('status', 200)
        .expect('json', 'action', 'response')
        .then(({ json }) => {
          expect(json.body).toContain(`${productName} costs ${productPrice}¤`);
        });
    });

    it('Handles custom callbacks with proper responses', async () => {
      const functionTest = trainingData.data.find((data) => data.intent === 'queries.functionTest');
      if (!functionTest) throw new Error('Function test data not found');

      const testCommand = functionTest.utterances[0];
      const testResponse = '3be2e438b7f3d04c89d7749f727bb3bd';

      const { token } = await login({
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=',
      });

      await setupAuthenticatedRequest(token)
        .post(`${REST_URL}chatbot/respond`, {
          body: {
            action: 'query',
            query: testCommand,
          },
        })
        .expect('status', 200)
        .expect('json', 'action', 'response')
        .expect('json', 'body', testResponse);
    });

    it('Handles unauthenticated user errors for POST requests', () => {
      const testCommand = trainingData.data[0].utterances[0];
      return frisby
        .post(`${REST_URL}chatbot/respond`, {
          body: {
            query: testCommand,
          },
        })
        .expect('status', 401)
        .expect('json', 'error', 'Unauthenticated user');
    });

    it('Returns 500 when the user name is set to crash request', async () => {
      await frisby.post(`${API_URL}/Users`, {
        body: {
          email: `chatbot-testuser@${config.get<string>('application.domain')}`,
          password: 'testtesttest',
          username: '"',
          role: 'admin',
        },
      });

      const { token } = await login({
        email: `chatbot-testuser@${config.get<string>('application.domain')}`,
        password: 'testtesttest',
      });

      const functionTest = trainingData.data.find((data) => data.intent === 'queries.functionTest');
      if (!functionTest) throw new Error('Function test data not found');

      const testCommand = functionTest.utterances[0];

      await setupAuthenticatedRequest(token)
        .post(`${REST_URL}chatbot/respond`, {
          body: {
            action: 'query',
            query: testCommand,
          },
        })
        .inspectResponse()
        .expect('status', 500);
    });
  });
});

