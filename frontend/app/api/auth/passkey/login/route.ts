import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/db';
import dbConnect from '@/lib/db';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const RP_ID = process.env.RP_ID || 'localhost';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { username, authenticationResponse } = await req.json();

    if (!username || !authenticationResponse) {
      return NextResponse.json({ error: 'Username and authentication response are required' }, { status: 400 });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const passkey = user.passkeys.find(
      (pk: any) => pk.credentialID === authenticationResponse.rawId
    );

    if (!passkey) {
      return NextResponse.json({ error: 'Passkey not found for this user' }, { status: 404 });
    }

    const expectedChallenge = (global as any).currentChallenge;

    if (!expectedChallenge) {
      return NextResponse.json({ error: 'No challenge found. Please restart login.' }, { status: 400 });
    }

    // Simple verification - in production, use proper WebAuthn verification
    const response = authenticationResponse.response;
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

    // Update counter (simplified)
    passkey.counter += 1;
    await user.save();

    // Generate JWT
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });

    console.log('🔑 JWT generated successfully');
    console.log('🔑 JWT_SECRET being used:', JWT_SECRET === 'your_super_secret_jwt_key' ? 'Default fallback' : 'Environment variable');
    console.log('🔑 Token preview:', token.substring(0, 50) + '...');

    const responseObj = NextResponse.json({ 
      message: 'Login successful', 
      success: true,
      user: { id: user._id, username: user.username }
    }, { status: 200 });
    
    responseObj.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to allow redirects
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    console.log('🍪 Cookie set with token, maxAge: 1 hour, httpOnly: true, sameSite: lax');

    return responseObj;
  } catch (error) {
    console.error('Error during authentication:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
