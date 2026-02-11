import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { logger } from "@/utils/logger";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.warn(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-background text-foreground"
      aria-labelledby="not-found-heading"
    >
      <div className="text-center px-4">
        <h1 id="not-found-heading" className="text-4xl font-bold mb-4">
          404
        </h1>
        <p className="text-xl text-muted-foreground mb-6">
          Oops! Page not found
        </p>
        <Link
          to="/"
          className="text-primary hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
        >
          Return to Home
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
