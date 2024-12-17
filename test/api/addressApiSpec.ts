/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

// Addresss.test.ts

import frisby from 'frisby';

// Constants
const API_URL = 'http://localhost:3000/api';
const REST_URL = 'http://localhost:3000/rest';
const jsonHeader = { 'content-type': 'application/json' };

let authHeader: { Authorization: string, 'content-type': string };
let addressId: string;

const validAddress = {
  fullName: 'Jim',
  mobileNum: '9800000000',
  zipCode: 'NX 101',
  streetAddress: 'Bakers Street',
  city: 'NYC',
  state: 'NY',
  country: 'USA'
};

const invalidPinCode = { zipCode: 'NX 10111111' };
const invalidMobileNumber = { mobileNum: '10000000000' };

// Authenticate user and set token
const authenticateUser = async () => {
  const response = await frisby.post(`${REST_URL}/user/login`, {
    headers: jsonHeader,
    body: {
      email: 'jim@juice-sh.op',
      password: 'ncc-1701'
    }
  });

  if (response.status === 200) {
    const { token } = response.json.authentication;
    authHeader = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  }
};

// Helper functions
const sendPostRequest = (addressBody, auth = true) => {
  return frisby.post(`${API_URL}/Addresss`, {
    headers: auth ? authHeader : null,
    body: addressBody
  });
};

const sendPutRequest = (addressId, body) => {
  return frisby.put(`${API_URL}/Addresss/${addressId}`, {
    headers: authHeader,
    body
  }, { json: true });
};

const sendDeleteRequest = (addressId) => {
  return frisby.del(`${API_URL}/Addresss/${addressId}`, { headers: authHeader });
};

beforeAll(async () => {
  await authenticateUser();

  const response = await sendPostRequest(validAddress);
  addressId = response.json.data.id;
});

describe('/api/Addresss', () => {

  it('GET all addresses is forbidden via public API', async () => {
    await frisby.get(`${API_URL}/Addresss`).expect('status', 401);
  });

  it('GET all addresses with authentication', async () => {
    await frisby.get(`${API_URL}/Addresss`, { headers: authHeader }).expect('status', 200);
  });

  it('POST new address with all valid fields', async () => {
    await sendPostRequest(validAddress).expect('status', 201);
  });

  it('POST new address with invalid pin code', async () => {
    await sendPostRequest({ ...validAddress, ...invalidPinCode }).expect('status', 400);
  });

  it('POST new address with invalid mobile number', async () => {
    await sendPostRequest({ ...validAddress, ...invalidMobileNumber }).expect('status', 400);
  });

  it('POST new address is forbidden via public API', async () => {
    await sendPostRequest(validAddress, false).expect('status', 401);
  });
});

describe('/api/Addresss/:id', () => {

  it('GET address by id is forbidden via public API', async () => {
    await frisby.get(`${API_URL}/Addresss/${addressId}`).expect('status', 401);
  });

  it('PUT update address is forbidden via public API', async () => {
    await sendPutRequest(addressId, { quantity: 2 }).expect('status', 401);
  });

  it('DELETE address by id is forbidden via public API', async () => {
    await sendDeleteRequest(addressId).expect('status', 401);
  });

  it('GET address by id with authentication', async () => {
    await frisby.get(`${API_URL}/Addresss/${addressId}`, { headers: authHeader }).expect('status', 200);
  });

  it('PUT update address by id with valid data', async () => {
    await sendPutRequest(addressId, { fullName: 'Jimy' })
      .expect('status', 200)
      .expect('json', 'data', { fullName: 'Jimy' });
  });

  it('PUT update address by id with invalid mobile number', async () => {
    await sendPutRequest(addressId, { mobileNum: '10000000000' }).expect('status', 400);
  });

  it('PUT update address by id with invalid pin code', async () => {
    await sendPutRequest(addressId, { zipCode: 'NX 10111111' }).expect('status', 400);
  });

  it('DELETE address by id with authentication', async () => {
    await sendDeleteRequest(addressId).expect('status', 200);
  });
});


/*
import frisby = require('frisby')

const API_URL = 'http://localhost:3000/api'
const REST_URL = 'http://localhost:3000/rest'

const jsonHeader = { 'content-type': 'application/json' }
let authHeader: { Authorization: string, 'content-type': string }
let addressId: string

beforeAll(() => {
  return frisby.post(REST_URL + '/user/login', {
    headers: jsonHeader,
    body: {
      email: 'jim@juice-sh.op',
      password: 'ncc-1701'
    }
  })
    .expect('status', 200)
    .then(({ json }) => {
      authHeader = { Authorization: 'Bearer ' + json.authentication.token, 'content-type': 'application/json' }
    })
})

describe('/api/Addresss', () => {

  const validAddress = {
    fullName: 'Jim',
    mobileNum: '9800000000',
    zipCode: 'NX 101',
    streetAddress: 'Bakers Street',
    city: 'NYC',
    state: 'NY',
    country: 'USA'
  };

  const invalidPinCode = {
    zipCode: 'NX 10111111'
  };

  const invalidMobileNumber = {
    mobileNum: '10000000000'
  };

  const sendPostRequest = (addressBody, auth = true) => {
    return frisby.post(API_URL + '/Addresss', {
      headers: auth ? authHeader : null,
      body: addressBody
    });
  };

  it('GET all addresses is forbidden via public API', () => {
    return frisby.get(API_URL + '/Addresss')
      .expect('status', 401);
  });

  it('GET all addresses with authentication', () => {
    return frisby.get(API_URL + '/Addresss', { headers: authHeader })
      .expect('status', 200);
  });

  it('POST new address with all valid fields', () => {
    return sendPostRequest(validAddress)
      .expect('status', 201);
  });

  it('POST new address with invalid pin code', () => {
    return sendPostRequest({
      ...validAddress,
      ...invalidPinCode
    })
      .expect('status', 400);
  });

  it('POST new address with invalid mobile number', () => {
    return sendPostRequest({
      ...validAddress,
      ...invalidMobileNumber
    })
      .expect('status', 400);
  });

  it('POST new address is forbidden via public API', () => {
    return sendPostRequest(validAddress, false)
      .expect('status', 401);
  });
});


describe('/api/Addresss/:id', () => {

  const validAddress = {
    fullName: 'Jim',
    mobileNum: '9800000000',
    zipCode: 'NX 101',
    streetAddress: 'Bakers Street',
    city: 'NYC',
    state: 'NY',
    country: 'USA'
  };

  const sendPutRequest = (addressId, body) => {
    return frisby.put(API_URL + `/Addresss/${addressId}`, {
      headers: authHeader,
      body
    }, { json: true });
  };

  const sendDeleteRequest = (addressId) => {
    return frisby.del(API_URL + `/Addresss/${addressId}`, { headers: authHeader });
  };

  beforeAll(() => {
    return frisby.post(API_URL + '/Addresss', {
      headers: authHeader,
      body: validAddress
    })
      .expect('status', 201)
      .then(({ json }) => {
        addressId = json.data.id;
      });
  });

  it('GET address by id is forbidden via public API', () => {
    return frisby.get(API_URL + `/Addresss/${addressId}`)
      .expect('status', 401);
  });

  it('PUT update address is forbidden via public API', () => {
    return sendPutRequest(addressId, { quantity: 2 })
      .expect('status', 401);
  });

  it('DELETE address by id is forbidden via public API', () => {
    return sendDeleteRequest(addressId)
      .expect('status', 401);
  });

  it('GET address by id with authentication', () => {
    return frisby.get(API_URL + `/Addresss/${addressId}`, { headers: authHeader })
      .expect('status', 200);
  });

  it('PUT update address by id with valid data', () => {
    return sendPutRequest(addressId, { fullName: 'Jimy' })
      .expect('status', 200)
      .expect('json', 'data', { fullName: 'Jimy' });
  });

  it('PUT update address by id with invalid mobile number', () => {
    return sendPutRequest(addressId, { mobileNum: '10000000000' })
      .expect('status', 400);
  });

  it('PUT update address by id with invalid pin code', () => {
    return sendPutRequest(addressId, { zipCode: 'NX 10111111' })
      .expect('status', 400);
  });

  it('DELETE address by id with authentication', () => {
    return sendDeleteRequest(addressId)
      .expect('status', 200);
  });
});

/*
describe('/api/Addresss', () => {
  it('GET all addresses is forbidden via public API', () => {
    return frisby.get(API_URL + '/Addresss')
      .expect('status', 401)
  })

  it('GET all addresses', () => {
    return frisby.get(API_URL + '/Addresss', { headers: authHeader })
      .expect('status', 200)
  })

  it('POST new address with all valid fields', () => {
    return frisby.post(API_URL + '/Addresss', {
      headers: authHeader,
      body: {
        fullName: 'Jim',
        mobileNum: '9800000000',
        zipCode: 'NX 101',
        streetAddress: 'Bakers Street',
        city: 'NYC',
        state: 'NY',
        country: 'USA'
      }
    })
      .expect('status', 201)
  })

  it('POST new address with invalid pin code', () => {
    return frisby.post(API_URL + '/Addresss', {
      headers: authHeader,
      body: {
        fullName: 'Jim',
        mobileNum: '9800000000',
        zipCode: 'NX 10111111',
        streetAddress: 'Bakers Street',
        city: 'NYC',
        state: 'NY',
        country: 'USA'
      }
    })
      .expect('status', 400)
  })

  it('POST new address with invalid mobile number', () => {
    return frisby.post(API_URL + '/Addresss', {
      headers: authHeader,
      body: {
        fullName: 'Jim',
        mobileNum: '10000000000',
        zipCode: 'NX 101',
        streetAddress: 'Bakers Street',
        city: 'NYC',
        state: 'NY',
        country: 'USA'
      }
    })
      .expect('status', 400)
  })

  it('POST new address is forbidden via public API', () => {
    return frisby.post(API_URL + '/Addresss', {
      fullName: 'Jim',
      mobileNum: '9800000000',
      zipCode: 'NX 10111111',
      streetAddress: 'Bakers Street',
      city: 'NYC',
      state: 'NY',
      country: 'USA'
    })
      .expect('status', 401)
  })


})

describe('/api/Addresss/:id', () => {
  beforeAll(() => {
    return frisby.post(API_URL + '/Addresss', {
      headers: authHeader,
      body: {
        fullName: 'Jim',
        mobileNum: '9800000000',
        zipCode: 'NX 101',
        streetAddress: 'Bakers Street',
        city: 'NYC',
        state: 'NY',
        country: 'USA'
      }
    })
      .expect('status', 201)
      .then(({ json }) => {
        addressId = json.data.id
      })
  })

  it('GET address by id is forbidden via public API', () => {
    return frisby.get(API_URL + '/Addresss/' + addressId)
      .expect('status', 401)
  })

  it('PUT update address is forbidden via public API', () => {
    return frisby.put(API_URL + '/Addresss/' + addressId, {
      quantity: 2
    }, { json: true })
      .expect('status', 401)
  })

  it('DELETE address by id is forbidden via public API', () => {
    return frisby.del(API_URL + '/Addresss/' + addressId)
      .expect('status', 401)
  })

  it('GET address by id', () => {
    return frisby.get(API_URL + '/Addresss/' + addressId, { headers: authHeader })
      .expect('status', 200)
  })

  it('PUT update address by id', () => {
    return frisby.put(API_URL + '/Addresss/' + addressId, {
      headers: authHeader,
      body: {
        fullName: 'Jimy'
      }
    }, { json: true })
      .expect('status', 200)
      .expect('json', 'data', { fullName: 'Jimy' })
  })

  it('PUT update address by id with invalid mobile number is forbidden', () => {
    return frisby.put(API_URL + '/Addresss/' + addressId, {
      headers: authHeader,
      body: {
        mobileNum: '10000000000'
      }
    }, { json: true })
      .expect('status', 400)
  })

  it('PUT update address by id with invalid pin code is forbidden', () => {
    return frisby.put(API_URL + '/Addresss/' + addressId, {
      headers: authHeader,
      body: {
        zipCode: 'NX 10111111'
      }
    }, { json: true })
      .expect('status', 400)
  })

  it('DELETE address by id', () => {
    return frisby.del(API_URL + '/Addresss/' + addressId, { headers: authHeader })
      .expect('status', 200)
  })
  */
})

*/
