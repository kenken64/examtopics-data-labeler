import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Replace with your actual Relying Party ID and Name
const RP_ID = process.env.RP_ID || 'localhost'; // Your website's domain (e.g., 'example.com')
const RP_NAME = process.env.RP_NAME || 'AWS Cert Web'; // Your website's name

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Generate a challenge
    const challenge = crypto.randomBytes(32);
    const userID = crypto.randomBytes(32);

    const options = {
      publicKey: {
        rp: {
          id: RP_ID,
          name: RP_NAME,
        },
        user: {
          id: Buffer.from(userID).toString('base64url'),
          name: username,
          displayName: username,
        },
        challenge: Buffer.from(challenge).toString('base64url'),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        timeout: 60000,
        attestation: 'none',
        excludeCredentials: [], // In a real app, exclude existing credentials
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'preferred',
        },
      },
    };

    // Store the challenge for later verification (in a real app, use a session store)
    (global as any).currentChallenge = Buffer.from(challenge).toString('base64url');
    (global as any).currentUserID = Buffer.from(userID).toString('base64url');

    return NextResponse.json(options);
  } catch (error) {
    console.error('Error generating registration options:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
