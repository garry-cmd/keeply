import type { Metadata, Viewport } from "next";
import Script from 'next/script'
import "./globals.css";

export const metadata: Metadata = {
  title: "Keeply",
  description: "AI boat maintenance manager — track repairs, log passages, and get AI-powered part recommendations.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Keeply",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f4c8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ── Google Analytics 4 ── */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-FZWNP48NHN" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-FZWNP48NHN');`,
          }}
        />
        {/* ── Fonts ── */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Keeply" />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js');
  });
}`,
          }}
        />
      
      <Script id="posthog" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}var u=e;for(var c=0;c<["capture","identify","alias","people.set","people.set_once","set","set_once","unset","increment","append","union","track_links","track_forms","track_pageview","register","register_once","unregister","reset","isFeatureEnabled","reloadFeatureFlags","group","resetGroups","startSessionRecording","stopSessionRecording"].length;c++)g(u,["capture","identify","alias","people.set","people.set_once","set","set_once","unset","increment","append","union","track_links","track_forms","track_pageview","register","register_once","unregister","reset","isFeatureEnabled","reloadFeatureFlags","group","resetGroups","startSessionRecording","stopSessionRecording"][c]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||(window.posthog=[]));
        posthog.init('phc_ABYwoFdJFXnSD5QZc25DivMHPULWCgGSyutHX7jia4VD',{api_host:'https://us.i.posthog.com',capture_pageview:true,autocapture:false,person_profiles:'identified_only'});
      ` }} />
      </body>
    </html>
  );
}
