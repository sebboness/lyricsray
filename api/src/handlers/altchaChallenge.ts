import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createAltchaChallenge } from '../util/altcha';
import { ok, fromError } from '../util/response';

export async function altchaChallengeHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const challenge = await createAltchaChallenge();
    return ok(challenge, origin);
  } catch (err) {
    return fromError(err, origin);
  }
}
