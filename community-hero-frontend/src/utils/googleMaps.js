const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY?.trim();

if (!googleMapsApiKey && process.env.NODE_ENV === 'production') {
  throw new Error('REACT_APP_GOOGLE_MAPS_API_KEY is required for production builds.');
}

export const googleMapsLoaderOptions = {
  id: 'community-map-google',
  googleMapsApiKey,
  version: 'weekly',
  language: 'en',
  region: 'US',
  libraries: ['maps']
};
