// Server component. LandingPage SSRs into the initial HTML so the browser
// preloader can discover the hero <img> without waiting for React to hydrate.
// HomeClient is a client component that takes over after hydration to swap
// in <KeeplyApp /> when the user is authenticated.

import LandingPage from '../components/LandingPage';
import HomeClient from '../components/HomeClient';

export default function Home() {
  return (
    <HomeClient>
      <LandingPage />
    </HomeClient>
  );
}
