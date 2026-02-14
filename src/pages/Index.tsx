import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { MarketsDashboard } from "@/components/MarketsDashboard";

const Index = () => {
  // Ensure homepage meta tags use default-pfp.jpeg
  useEffect(() => {
    document.title = "Stonk Market";
    const defaultImage = `${window.location.origin}/default-pfp.jpeg`;

    // Update or create og:title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute("content", "Stonk Market");

    // Update or create og:image
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement("meta");
      ogImage.setAttribute("property", "og:image");
      document.head.appendChild(ogImage);
    }
    ogImage.setAttribute("content", defaultImage);

    // Update or create og:description
    let ogDescription = document.querySelector(
      'meta[property="og:description"]'
    );
    if (!ogDescription) {
      ogDescription = document.createElement("meta");
      ogDescription.setAttribute("property", "og:description");
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute(
      "content",
      "Stonk Market - Trade tokens on the decentralized exchange"
    );

    // Update or create twitter:image
    let twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (!twitterImage) {
      twitterImage = document.createElement("meta");
      twitterImage.setAttribute("name", "twitter:image");
      document.head.appendChild(twitterImage);
    }
    twitterImage.setAttribute("content", defaultImage);
  }, []);

  return (
    <Layout>
      <MarketsDashboard />
    </Layout>
  );
};

export default Index;
