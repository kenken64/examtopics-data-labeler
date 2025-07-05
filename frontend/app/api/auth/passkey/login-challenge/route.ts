import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/db';
import dbConnect from '@/lib/db';
import crypto from 'crypto';

const RP_ID = process.env.RP_ID || 'localhost';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate a challenge
    const challenge = crypto.randomBytes(32);

    const options = {
      publicKey: {
        challenge: Buffer.from(challenge).toString('base64url'),
        timeout: 60000,
        rpId: RP_ID,
        allowCredentials: user.passkeys.map((passkey: any) => ({
          type: 'public-key',
          id: passkey.credentialID, // Keep as base64url string
          transports: passkey.transports || [],
        })),
        userVerification: 'preferred',
      },
    };

    // Store the challenge for later verification (in a real app, use a session store)
    (global as any).currentChallenge = Buffer.from(challenge).toString('base64url');

    return NextResponse.json(options);
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
