import { Calendar, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

const EVENTS = [
  {
    title: "Author Talk: Voices of the Gulf",
    description: "A panel of celebrated Gulf authors discuss contemporary Arabic literature, identity, and the future of storytelling in the region.",
    date: "Saturday, May 3, 2026",
    time: "6:00 PM – 8:00 PM",
    location: "Main Auditorium, Floor 1",
    type: "Author Talk",
    lang: "Arabic & English",
    free: true,
  },
  {
    title: "Children's Storytelling Hour",
    description: "Join our librarians for magical stories, illustrated readings and craft activities for children aged 4–10.",
    date: "Every Saturday",
    time: "10:00 AM – 11:30 AM",
    location: "Children's Library, Floor 1",
    type: "Kids Program",
    lang: "Arabic & English",
    free: true,
  },
  {
    title: "Arabic Calligraphy Workshop",
    description: "Learn the ancient art of Arabic calligraphy with master calligrapher Ahmed Al-Rashid. All materials provided. Limited to 20 participants.",
    date: "Saturday, May 10, 2026",
    time: "3:00 PM – 5:30 PM",
    location: "Workshop Room 3, Floor 2",
    type: "Workshop",
    lang: "Arabic",
    free: false,
  },
  {
    title: "World Literature Book Club",
    description: "This month we're reading 'One Hundred Years of Solitude' by Gabriel García Márquez. Come ready to discuss, debate, and discover.",
    date: "Thursday, May 17, 2026",
    time: "7:00 PM – 9:00 PM",
    location: "Reading Hall B, Floor 3",
    type: "Book Club",
    lang: "English",
    free: true,
  },
  {
    title: "Research Skills Workshop",
    description: "A practical session on using ProQuest, Al Manhal, and MBRL digital databases for academic research. Perfect for students and researchers.",
    date: "Wednesday, May 22, 2026",
    time: "2:00 PM – 4:00 PM",
    location: "Information Centre, Floor 4",
    type: "Workshop",
    lang: "English & Arabic",
    free: true,
  },
  {
    title: "Young Adult Reading Challenge Kickoff",
    description: "Launch event for the summer Young Adult Reading Challenge — students aged 13–18 earn badges and prizes for books read.",
    date: "Friday, May 24, 2026",
    time: "4:00 PM – 6:00 PM",
    location: "Young Adult Library, Floor 2",
    type: "Kids Program",
    lang: "English & Arabic",
    free: true,
  },
  {
    title: "Business Innovation Speaker Series",
    description: "Hear from UAE entrepreneurs and business leaders on building companies in the digital age. Networking session follows.",
    date: "Monday, June 2, 2026",
    time: "6:30 PM – 8:30 PM",
    location: "Business Library Event Space, Floor 5",
    type: "Lecture",
    lang: "English",
    free: false,
  },
  {
    title: "Rare Books & Manuscripts Tour",
    description: "A guided tour of the Special Collections on Floor 7, featuring manuscripts from the 13th century, rare atlases, and first editions.",
    date: "Saturday, June 7, 2026",
    time: "11:00 AM – 12:30 PM",
    location: "Special Collections, Floor 7",
    type: "Tour",
    lang: "English & Arabic",
    free: true,
  },
];

const TYPE_COLORS: Record<string, string> = {
  "Author Talk": "bg-blue-100 text-blue-800 border-blue-200",
  "Kids Program": "bg-green-100 text-green-800 border-green-200",
  "Workshop": "bg-purple-100 text-purple-800 border-purple-200",
  "Book Club": "bg-amber-100 text-amber-800 border-amber-200",
  "Lecture": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Tour": "bg-teal-100 text-teal-800 border-teal-200",
};

export default function Events() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="navy-gradient text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">Calendar</p>
          <h1 className="font-serif text-5xl font-bold mb-4">Events & Programs</h1>
          <p className="text-white/70 text-lg max-w-xl">
            Author talks, workshops, reading clubs, guided tours and children's programs — enriching the community all year round.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {EVENTS.map((event) => (
            <div key={event.title} className="bg-white rounded-xl border border-border p-6 hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", TYPE_COLORS[event.type])}>
                    {event.type}
                  </span>
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", event.free ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800")}>
                    {event.free ? "Free" : "Ticketed"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{event.lang}</span>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">{event.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{event.description}</p>
              </div>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-accent" />{event.date}</div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-accent" />{event.time}</div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-accent" />{event.location}</div>
              </div>

              <Button asChild className="bg-primary text-white hover:bg-primary/90 mt-auto">
                <a href="https://www.mbrl.ae/events" target="_blank" rel="noopener noreferrer">
                  Register / Learn More
                </a>
              </Button>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
