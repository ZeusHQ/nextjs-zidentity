import nock from 'nock';
import { Client, Issuer } from 'openid-client';
import { getConfig, clientFactory, ConfigParameters } from '../../src/zsession';
import { jwks } from './fixtures/cert';
import pkg from '../../package.json';
import wellKnown from './fixtures/well-known.json';
import version from '../../src/version';

const defaultConfig = {
  secret: '__test_session_secret__',
  clientID: '__test_client_id__',
  clientSecret: '__test_client_secret__',
  issuerBaseURL: 'https://op.example.com',
  baseURL: 'https://example.org',
  routes: {
    callback: '/callback'
  }
};

const getClient = (params: ConfigParameters = {}): Promise<Client> =>
  clientFactory(getConfig({ ...defaultConfig, ...params }), { name: 'nextjs-zidentity', version })();

describe('clientFactory', function () {
  beforeEach(() => {
    if (!nock.isActive()) {
      nock.activate();
    }
    nock('https://op.example.com').get('/.well-known/openid-configuration').reply(200, wellKnown);
    nock('https://op.example.com').get('/.well-known/jwks.json').reply(200, jwks);
    nock('https://op.example.com')
      .post('/introspection')
      .reply(200, function () {
        return this.req.headers;
      });
  });

  afterEach(() => {
    nock.restore();
    nock.cleanAll();
  });

  it('should save the passed values', async function () {
    const client = await getClient();
    expect(client.client_id).toEqual('__test_client_id__');
    expect(client.client_secret).toEqual('__test_client_secret__');
  });

  it('should send the correct default headers', async function () {
    const client = await getClient();
    const headers = await client.introspect('__test_token__', '__test_hint__');
    const headerProps = Object.getOwnPropertyNames(headers);

    expect(headerProps).toContain('zidentity-client');

    const decodedTelemetry = JSON.parse(Buffer.from(headers['zidentity-client'] as string, 'base64').toString('ascii'));

    expect(decodedTelemetry.name).toEqual('nextjs-zidentity');
    expect(decodedTelemetry.version).toEqual(pkg.version);
    expect(decodedTelemetry.env.node).toEqual(process.version);

    expect(headerProps).toContain('user-agent');
    expect(headers['user-agent']).toEqual(`nextjs-zidentity/${pkg.version}`);
  });

  it('should disable telemetry', async function () {
    const client = await getClient({ enableTelemetry: false });
    const headers = await client.introspect('__test_token__', '__test_hint__');
    const headerProps = Object.getOwnPropertyNames(headers);

    expect(headerProps).not.toContain('zidentity-client');
  });

  it('should not strip new headers', async function () {
    const client = await getClient();
    const response = await client.requestResource('https://op.example.com/introspection', 'token', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer foo'
      }
    });
    const headerProps = Object.getOwnPropertyNames(JSON.parse(response.body.toString()));

    expect(headerProps).toContain('authorization');
  });

  it('should prefer user configuration regardless of idP discovery', async function () {
    nock('https://op2.example.com')
      .get('/.well-known/openid-configuration')
      .reply(
        200,
        Object.assign({}, wellKnown, {
          id_token_signing_alg_values_supported: ['none']
        })
      );

    const client = await getClient({
      issuerBaseURL: 'https://op2.example.com',
      idTokenSigningAlg: 'RS256'
    });
    expect(client.id_token_signed_response_alg).toEqual('RS256');
  });

  it('should create custom logout for zeus auth', async function () {
    nock('https://zeus.zidentity.io')
      .get('/.well-known/openid-configuration')
      .reply(200, { ...wellKnown, issuer: 'https://zeus.zidentity.io/', end_session_endpoint: undefined });
    nock('https://zeus.zidentity.io').get('/.well-known/jwks.json').reply(200, jwks);

    const client = await getClient({
      issuerBaseURL: 'https://zeus.zidentity.io',
      idpLogout: true
    });
    expect(client.endSessionUrl({ post_logout_redirect_uri: 'foo' })).toEqual(
      'https://zeus.zidentity.io/v2/logout?returnTo=foo&client_id=__test_client_id__'
    );
  });

  it('should handle limited openid-configuration', async function () {
    nock('https://op2.example.com')
      .get('/.well-known/openid-configuration')
      .reply(
        200,
        Object.assign({}, wellKnown, {
          id_token_signing_alg_values_supported: undefined,
          response_types_supported: undefined,
          response_modes_supported: 'foo',
          end_session_endpoint: undefined
        })
      );

    await expect(
      getClient({
        issuerBaseURL: 'https://op2.example.com',
        idpLogout: true
      })
    ).resolves.not.toThrow();
  });

  it('should not disclose stack trace in AggregateError message when discovery fails', async () => {
    nock.cleanAll();
    nock('https://op.example.com').get('/.well-known/oauth-authorization-server').reply(500);
    nock('https://op.example.com').get('/.well-known/openid-configuration').reply(500);
    await expect(getClient()).rejects.toThrowError(new Error('expected 200 OK, got: 500 Internal Server Error'));
  });

  it('should not normalize individual errors from discovery', async () => {
    jest.spyOn(Issuer, 'discover').mockRejectedValue(new Error('foo'));
    await expect(getClient()).rejects.toThrowError(new Error('foo'));
  });
});
