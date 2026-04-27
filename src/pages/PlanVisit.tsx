import { MapPin, Clock, Train, Car, Phone, Wifi, Bot, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const HOURS = [
  { day: "Monday – Thursday", hours: "9:00 AM – 9:00 PM" },
  { day: "Friday", hours: "2:00 PM – 9:00 PM" },
  { day: "Saturday", hours: "9:00 AM – 9:00 PM" },
  { day: "Sunday", hours: "Closed" },
];

const SMART_SERVICES = [
  { icon: Bot, title: "Pepper Robots", desc: "Our friendly robots greet visitors, answer questions, provide directions, and even read stories to children." },
  { icon: Camera, title: "AR Experiences", desc: "Use the MBRL app inside the library for augmented reality overlays on exhibits, artwork, and rare collections." },
  { icon: "🚂", title: "Monorail Book System", desc: "Books are transported automatically through the library via an overhead rail system — watch it in action!" },
  { icon: "🔬", title: "Cobra Scanner", desc: "Specialised scanning technology for digitising rare and fragile manuscripts without damage." },
  { icon: Wifi, title: "Free High-Speed Wi-Fi", desc: "Fast internet throughout all 7 floors for members and visitors alike." },
  { icon: "☕", title: "Café & Bookshop", desc: "Ground floor café and bookshop — perfect before or after your visit." },
];

export default function PlanVisit() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="navy-gradient text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">Visitor Information</p>
          <h1 className="font-serif text-5xl font-bold mb-4">Plan Your Visit</h1>
          <p className="text-white/70 text-lg max-w-xl">
            Free to enter for everyone. Come explore 7 floors of books, rare manuscripts, digital resources, and one of Dubai's most iconic buildings.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 w-full space-y-14">
        {/* Location + Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Location */}
          <div className="bg-white rounded-2xl border border-border p-8">
            <h2 className="font-serif text-2xl font-bold text-primary mb-5 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-accent" /> Location
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="text-foreground font-medium">Mohammed Bin Rashid Library</p>
              <p>Al Jaddaf, Dubai Creek<br />Dubai, United Arab Emirates</p>
              <p className="font-arabic text-sm text-right border-t border-border pt-3">
                مكتبة محمد بن راشد — الجداف، خور دبي
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Train className="w-4 h-4 text-accent" /> Getting Here
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>🚇 <strong>Metro:</strong> Al Jaddaf Station (Red Line) — 5 min walk</p>
                <p>🚌 <strong>Bus:</strong> Routes 9, 27, and 61 stop nearby</p>
                <p>🚗 <strong>Car:</strong> Free parking available on site</p>
                <p>🚕 <strong>Taxi / Careem:</strong> Search "Mohammed Bin Rashid Library"</p>
              </div>
            </div>

            <Button asChild className="mt-6 bg-primary text-white hover:bg-primary/90 w-full">
              <a href="https://maps.google.com/?q=Mohammed+Bin+Rashid+Library+Dubai" target="_blank" rel="noopener noreferrer">
                Open in Google Maps
              </a>
            </Button>
          </div>

          {/* Hours */}
          <div className="bg-white rounded-2xl border border-border p-8">
            <h2 className="font-serif text-2xl font-bold text-primary mb-5 flex items-center gap-2">
              <Clock className="w-6 h-6 text-accent" /> Opening Hours
            </h2>
            <div className="space-y-3">
              {HOURS.map(({ day, hours }) => (
                <div key={day} className={`flex items-center justify-between py-3 border-b border-border last:border-0 ${day === "Sunday" ? "text-red-500" : ""}`}>
                  <span className="font-medium text-foreground">{day}</span>
                  <span className={`text-sm font-semibold ${day === "Sunday" ? "text-red-500" : "text-accent"}`}>{hours}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-muted rounded-xl text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Free Entry</p>
              <p>No admission fee. Membership required only to borrow books or access digital services. Children under 5 are not permitted entry.</p>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4 text-accent" />
              <span>800-MBRL (6275)</span>
            </div>
          </div>
        </div>

        {/* Smart Services */}
        <div>
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-accent uppercase tracking-wider mb-2">Technology-Powered</p>
            <h2 className="font-serif text-3xl font-bold text-primary">Smart Library Services</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              MBRL is one of the world's most technologically advanced libraries — here's what to look out for.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SMART_SERVICES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-border p-6 hover:shadow-md hover:border-accent/30 transition-all">
                <div className="mb-3">
                  {typeof Icon === "string" ? (
                    <span className="text-3xl">{Icon}</span>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                  )}
                </div>
                <h3 className="font-serif font-semibold text-primary mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Floor guide */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-serif text-2xl font-bold text-primary">Floor Directory</h2>
          </div>
          <div className="divide-y divide-border">
            {[
              { floor: "Ground Floor", areas: "Entrance, Bookshop, Café, Pepper Robots, Member Services" },
              { floor: "Floor 1", areas: "General Library (Part 1), Children's Library, Family Reading Rooms" },
              { floor: "Floor 2", areas: "General Library (Part 2), Young Adult Library, Study Rooms" },
              { floor: "Floor 3", areas: "General Library (Part 3), Media & Arts Library, AV Booths" },
              { floor: "Floor 4", areas: "Information Centre, Map & Atlas Library, Research Rooms" },
              { floor: "Floor 5", areas: "Business Library, Emirates Library, Meeting Rooms" },
              { floor: "Floor 6", areas: "Periodicals Library, Digital Workstations, Quiet Study Hall" },
              { floor: "Floor 7", areas: "Special Collections, Treasures of the Library Exhibition, Rare Manuscripts" },
            ].map(({ floor, areas }) => (
              <div key={floor} className="flex gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                <span className="font-bold text-accent w-28 shrink-0">{floor}</span>
                <span className="text-sm text-muted-foreground">{areas}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
