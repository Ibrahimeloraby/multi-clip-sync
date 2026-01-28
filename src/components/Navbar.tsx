import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            {/* Logo with recording dot */}
            <div className="relative w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              {/* Stylized play/record icon */}
              <svg 
                viewBox="0 0 24 24" 
                className="w-5 h-5 text-primary-foreground"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              {/* Recording dot */}
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-destructive border-2 border-background shadow-sm" />
            </div>
            <span className="text-xl font-bold text-foreground hidden sm:block">
              Time<span className="gradient-text">Code</span>
            </span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Pricing
              </Button>
            </Link>
            
            <Link to="/join">
              <Button variant="outline" size="sm">
                Join
              </Button>
            </Link>
            
            <Link to="/create">
              <Button size="sm" className="gradient-primary shadow-md hover:shadow-lg transition-shadow">
                Create Session
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
