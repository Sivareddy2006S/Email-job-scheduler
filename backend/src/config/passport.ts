import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env';
import { userRepository } from '../repositories/userRepository';

passport.use(
  new GoogleStrategy(
    {
      clientID: env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL: env.google.callbackUrl,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('Google profile did not return an email address'));
        }

        const user = await userRepository.upsertFromGoogleProfile({
          googleId: profile.id,
          name: profile.displayName ?? email,
          email,
          avatarUrl: profile.photos?.[0]?.value,
        });

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as { id: string }).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await userRepository.findById(id);
    done(null, user ?? false);
  } catch (err) {
    done(err as Error);
  }
});

export { passport };
