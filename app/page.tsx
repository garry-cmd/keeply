// Server component. HomeClient is a client component that owns the auth
// state machine, lazy-loads KeeplyApp when authed, and renders LandingPage
// + auth modals when guest.
//
// This file used to wrap <HomeClient>{<LandingPage />}</HomeClient> so the
// landing markup was SSR'd into the initial HTML. After the rewrite, the
// SSR'd LandingPage tree is rendered by HomeClient itself — but Next.js
// still SSRs HomeClient (it's a client component, but the initial render
// runs on the server). The hero <img> preload in app/layout.tsx and the
// JSON-LD structured data still apply.
//
// If you need to change LandingPage rendering, edit components/marketing/
// LandingPage.tsx — not this file.

import HomeClient from '../components/HomeClient';

export default function Home() {
  return <HomeClient />;
}
