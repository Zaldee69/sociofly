export {};

declare global {
  interface CustomJwtSessionClaims {
    publicMetadata: {
      onboardingComplete?: boolean;
    };
  }
}
