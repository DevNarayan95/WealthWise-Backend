import {
  ACCESS_TOKEN_SECURITY_SCHEME,
  API_KEY_SECURITY_SCHEME,
  RequiresApiKey,
  RequiresApiKeyAndJwt,
} from './api-security.decorator';

// Metadata key used by @nestjs/swagger to store ApiSecurity requirements.
const API_SECURITY_METADATA = 'swagger/apiSecurity';

describe('api security decorators', () => {
  it('documents the API key requirement on a controller class', () => {
    @RequiresApiKey()
    class SampleController {}

    expect(
      Reflect.getMetadata(API_SECURITY_METADATA, SampleController),
    ).toEqual([{ [API_KEY_SECURITY_SCHEME]: [] }]);
  });

  it('documents API key and JWT together as one AND requirement', () => {
    @RequiresApiKeyAndJwt()
    class SampleController {}

    expect(
      Reflect.getMetadata(API_SECURITY_METADATA, SampleController),
    ).toEqual([
      {
        [API_KEY_SECURITY_SCHEME]: [],
        [ACCESS_TOKEN_SECURITY_SCHEME]: [],
      },
    ]);
  });
});
