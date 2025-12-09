const API_URL = 'https://api.stonkmarket.xyz';

interface TokenData {
  symbol?: string;
  name?: string;
  logoUrl?: string;
}

async function fetchTokenData(chainId: string, tokenAddress: string): Promise<TokenData | null> {
  try {
    const response = await fetch(
      `${API_URL}/api/token/find?address=${tokenAddress}&chain=${chainId}`,
      {
        headers: {
          'User-Agent': 'Vercel Edge Middleware',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch token data:', response.status);
      return null;
    }

    const data = await response.json();
    if (data && data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching token data:', error);
    return null;
  }
}

function injectMetaTags(html: string, tokenData: TokenData, requestUrl: string): string {
  const tokenSymbol = tokenData.symbol || tokenData.name || 'Token';
  const title = `${tokenSymbol} on Stonk Market`;
  const description = `View ${tokenSymbol} on Stonk Market`;

  // Use the Google Cloud Storage URL directly
  let imageUrl = tokenData.logoUrl || 'https://stonkmarket.xyz/default-pfp.jpeg';

  // If it's still a relative URL, make it absolute
  if (!imageUrl.startsWith('http')) {
    const url = new URL(requestUrl);
    imageUrl = `${url.origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }

  console.log('Meta tags:', { title, imageUrl });

  // Replace default meta tags with token-specific ones
  let modifiedHtml = html
    // Update title
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)

    // Update og:title
    .replace(
      /<meta property="og:title" content=".*?".*?\/>/,
      `<meta property="og:title" content="${title}" />`
    )

    // Update og:description
    .replace(
      /<meta property="og:description" content=".*?".*?\/>/,
      `<meta property="og:description" content="${description}" />`
    )

    // Update og:image
    .replace(
      /<meta property="og:image" content=".*?".*?\/>/,
      `<meta property="og:image" content="${imageUrl}" />`
    );

  // Add or update og:url
  if (html.includes('property="og:url"')) {
    modifiedHtml = modifiedHtml.replace(
      /<meta property="og:url" content=".*?".*?\/>/,
      `<meta property="og:url" content="${requestUrl}" />`
    );
  } else {
    modifiedHtml = modifiedHtml.replace(
      /<meta property="og:type" content="website" \/>/,
      `<meta property="og:type" content="website" />\n    <meta property="og:url" content="${requestUrl}" />`
    );
  }

  // Update Twitter meta tags
  modifiedHtml = modifiedHtml
    .replace(
      /<meta name="twitter:image" content=".*?".*?\/>/,
      `<meta name="twitter:image" content="${imageUrl}" />`
    );

  // Add or update twitter:title
  if (html.includes('name="twitter:title"')) {
    modifiedHtml = modifiedHtml.replace(
      /<meta name="twitter:title" content=".*?".*?\/>/,
      `<meta name="twitter:title" content="${title}" />`
    );
  } else {
    modifiedHtml = modifiedHtml.replace(
      /<meta name="twitter:site" content="@stonkmarket" \/>/,
      `<meta name="twitter:site" content="@stonkmarket" />\n    <meta name="twitter:title" content="${title}" />`
    );
  }

  // Add or update twitter:description
  if (html.includes('name="twitter:description"')) {
    modifiedHtml = modifiedHtml.replace(
      /<meta name="twitter:description" content=".*?".*?\/>/,
      `<meta name="twitter:description" content="${description}" />`
    );
  } else {
    modifiedHtml = modifiedHtml.replace(
      /<meta name="twitter:card" content="summary_large_image" \/>/,
      `<meta name="twitter:card" content="summary_large_image" />\n    <meta name="twitter:description" content="${description}" />`
    );
  }

  return modifiedHtml;
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const { pathname } = url;

  // Check if this is a token page request
  const tokenPageMatch = pathname.match(/^\/token\/([^\/]+)\/([^\/]+)/);

  if (!tokenPageMatch) {
    return;
  }

  const [, chainId, tokenAddress] = tokenPageMatch;

  try {
    // Fetch the index.html
    const indexUrl = new URL('/index.html', url.origin);
    const indexResponse = await fetch(indexUrl.toString());

    if (!indexResponse.ok) {
      return;
    }

    let html = await indexResponse.text();

    // Fetch token data
    const tokenData = await fetchTokenData(chainId, tokenAddress);

    if (tokenData) {
      html = injectMetaTags(html, tokenData, request.url);
    }

    // Return the modified HTML
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error in middleware:', error);
    return;
  }
}

export const config = {
  matcher: '/token/:chainId/:tokenAddress*',
};
