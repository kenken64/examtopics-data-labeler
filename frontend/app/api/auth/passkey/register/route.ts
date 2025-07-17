import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/db';
import dbConnect from '@/lib/db';

const RP_ID = process.env.RP_ID || 'localhost';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { username, attestationResponse } = await req.json();
    console.log('Received attestationResponse:', attestationResponse);

    if (!username || !attestationResponse) {
      return NextResponse.json({ error: 'Username and attestation response are required' }, { status: 400 });
    }

    let user = await User.findOne({ username });

    if (user) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const expectedChallenge = (global as any).currentChallenge;

    if (!expectedChallenge) {
      return NextResponse.json({ error: 'No challenge found. Please restart registration.' }, { status: 400 });
    }

    // Simple verification - in production, use proper WebAuthn verification
    const response = attestationResponse.response;
    const clientDataJSON = JSON.parse(Buffer.from(response.clientDataJSON, 'base64url').toString());
    
    // Verify challenge
    if (clientDataJSON.challenge !== expectedChallenge) {
      return NextResponse.json({ error: 'Challenge verification failed' }, { status: 400 });
    }

    // Verify origin
    const expectedOrigin = process.env.ORIGIN || `http://${RP_ID}:3000`;
    if (clientDataJSON.origin !== expectedOrigin) {
      return NextResponse.json({ error: 'Origin verification failed' }, { status: 400 });
    }

    // Store the credential
    user = new User({
      username,
      passkeys: [{
        credentialID: attestationResponse.rawId,
        publicKey: response.attestationObject, // Simplified - in production, extract the actual public key
        counter: 0,
        transports: response.transports || [],
      }],
    });

    await user.save();

    return NextResponse.json({ message: 'Registration successful' }, { status: 200 });
  } catch (error) {
    console.error('Error during registration:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
