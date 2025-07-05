import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

let cached = global as typeof global & {
  mongooseConnection?: typeof mongoose;
  promise?: Promise<typeof mongoose>;
};

async function dbConnect() {
  if (cached.mongooseConnection) {
    return cached.mongooseConnection;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.mongooseConnection = await cached.promise;
  return cached.mongooseConnection;
}

export default dbConnect;

const passkeySchema = new mongoose.Schema({
  credentialID: {
    type: String,
    required: true,
    unique: true,
  },
  publicKey: {
    type: String,
    required: true,
  },
  counter: {
    type: Number,
    required: true,
  },
  transports: {
    type: [String],
  },
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  passkeys: [passkeySchema],
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export { User };
