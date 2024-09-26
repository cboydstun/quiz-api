// config/passport.ts

import passport from '../utils/passport';

export const initializePassport = (app: any) => {
  app.use(passport.initialize());
  app.use(passport.session());
};
