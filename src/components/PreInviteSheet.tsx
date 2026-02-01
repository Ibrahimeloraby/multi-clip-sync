import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  UserPlus, X, MessageCircle, Share2, Copy, Check, Loader2, Users
} from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  phone?: string;
}

interface PreInviteSheetProps {
  sessionName: string;
  timeCode: string;
  onGoLive: () => void;
  children?: React.ReactNode;
}

const PreInviteSheet = ({ 
  sessionName, 
  timeCode, 
  onGoLive,
  children 
}: PreInviteSheetProps) => {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const smartLink = `${window.location.origin}/q/${timeCode}`;
  const inviteMessage = `Join my TimeCode session "${sessionName}"\n\n${smartLink}`;

  const addContact = () => {
    if (!newContact.trim()) return;
    
    const contact: Contact = {
      id: crypto.randomUUID(),
      name: newContact.trim(),
      phone: newContact.includes('@') ? undefined : newContact,
    };
    
    setContacts([...contacts, contact]);
    setNewContact("");
    toast.success(`Added ${contact.name}`);
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const sendInvites = async () => {
    if (contacts.length === 0) {
      // No contacts, just go live
      onGoLive();
      setOpen(false);
      return;
    }

    setSending(true);

    // For now, open SMS with all contacts
    // In future: integrate with actual SMS API or push notifications
    const phoneNumbers = contacts
      .filter(c => c.phone)
      .map(c => c.phone)
      .join(',');
    
    const smsBody = encodeURIComponent(inviteMessage);
    
    if (phoneNumbers) {
      window.location.href = `sms:${phoneNumbers}?body=${smsBody}`;
    }

    // Give user time to send, then go live
    setTimeout(() => {
      setSending(false);
      onGoLive();
      setOpen(false);
      toast.success("Session is live!");
    }, 1000);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(smartLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${sessionName}`,
          text: `Join my TimeCode session`,
          url: smartLink,
        });
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          copyLink();
        }
      }
    } else {
      copyLink();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite First
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Invite to "{sessionName}"
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-auto max-h-[calc(85vh-180px)]">
          {/* Quick share options */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Quick Share</Label>
            <div className="flex gap-2">
              <Button 
                onClick={handleNativeShare}
                className="flex-1 gap-2"
                variant="outline"
              >
                <Share2 className="w-4 h-4" />
                Share to Apps
              </Button>
              <Button 
                onClick={copyLink}
                variant="outline"
                className="gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            
            {/* Smart link display */}
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Session Link</p>
              <p className="font-mono text-sm break-all">{smartLink}</p>
            </div>
          </div>

          {/* Add contacts */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Pre-invite (optional)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Name or phone number"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addContact()}
              />
              <Button onClick={addContact} size="icon" variant="secondary">
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>

            {/* Contact list */}
            {contacts.length > 0 && (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div 
                    key={contact.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{contact.name}</p>
                      {contact.phone && (
                        <p className="text-xs text-muted-foreground">{contact.phone}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeContact(contact.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Go Live button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-pb">
          <Button 
            onClick={sendInvites}
            className="w-full h-14 text-lg gap-2 gradient-primary"
            disabled={sending}
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <MessageCircle className="w-5 h-5" />
            )}
            {contacts.length > 0 
              ? `Send Invites & Go Live (${contacts.length})`
              : "Go Live Now"
            }
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PreInviteSheet;
