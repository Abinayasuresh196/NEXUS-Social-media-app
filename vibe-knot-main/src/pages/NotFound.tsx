import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="text-center animate-fadeIn">
        <h1 className="mb-4 text-5xl md:text-6xl font-bold text-primary">404</h1>
        <p className="mb-6 text-xl md:text-2xl text-muted-foreground">
          Oops! Page not found
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Home
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
